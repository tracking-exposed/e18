#!/usr/bin/env nodejs
var _ = require('lodash');
var mongo = require('../../../lib/mongo');
var debug = require('debug')('bin:merge-all');
var moment = require('moment');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var nconf = require('nconf');

var mongo = require('../../../lib/mongo');
var various = require('../../../lib/various');

nconf.argv().env();

var begin ="2018-01-05";
var day = _.parseInt(nconf.get('day'));
if(!day)
    console.log("You need to specify --day and implicitly say which day is processed after the 10th of January");

/* declarations start below */


/* for every impression look at the associated post.
 *      if there is an external, look at entities.
 * the facebook original post in the DB 
 *      (maybe is older then the impression), and count viztimes
 */ 
function xtimpression(impressions, profiles) {

    return Promise.map(impressions.results, function(impre) {
        /* timezone fix */
        impre.impressionTime = new Date(moment(impre.impressionTime).add(1, 'h').toISOString());
        impre.visualizationDiff += 3600;

        mongo.forcedDBURL = 'mongodb://localhost/e18';
        return mongo
            .read('fbtposts', { 'postId': impre.postId })
            .then(_.first)
            .then(function(post) {
                if(!post) return null;

                var postInfo = _.pick(post, ['text', 'postId']);
                postInfo.orientaBot = _.find(profiles, { bot: impre.profile }).orientamento;

                if(_.size(post.externals)) {
                    /*
                    if(_.size(post.externals) > 1)
                        debug("More than 1 analyzed link in postId %s (impression %s)", post.postId, impre.id);
                        */
                    postInfo.entities_query = { id: post.externals[0].id };
                }

                return postInfo;
            })
            .then(function(postInfo) {
                if(postInfo.entities_query) {
                    mongo.forcedDBURL = 'mongodb://localhost/facebook';
                    return mongo
                        .read('entities', postInfo.entities_query)
                        .then(_.first)
                        .then(function(entities) {
                            _.unset(postInfo, 'entities_query');
                            if(!entities) {
                                debug("Error in %j", postInfo);
                                postInfo.broken = false;
                                return postInfo;
                            }
                            postInfo.externalId = entities.id;
                            postInfo.url = entities.url;
                            postInfo.original = entities.original;
                            postInfo.dandelion = !!_.size(entities.annotations)
                            if(entities.annotations)
                                postInfo.labels = _.map(entities.annotations, 'label');
                            else
                                postInfo.derror = entities.message;
                            return postInfo;
                        });
                }
                return postInfo;
            })
            .then(function(postInfo) {
                if(!postInfo) {
                    impre.broken = true;
                    debugger;
                }
                else
                    _.extend(impre, postInfo);
                return impre;
            })
            .catch(function(error) {
                debug("Error trap in processExtendImpressions, %s: %s", impre.id, error.message);
                impre.broken = true;
                return impre;
            });
    }, { concurrency: 10 })
    .tap(function(intermediary) {
        debug("broken: %s dandelion: %s",
            JSON.stringify( _.countBy(intermediary, 'broken'), undefined, 2),
            JSON.stringify( _.countBy(intermediary, 'dandelion'), undefined, 2)
        );
    })
    .then(_.orderBy('impressionTime', 'Asc'))
    .map(function(extimp) {
        /* now look in the `merge` database where the FBapi posts are kept: found the same, 
         * count the previously seen, save this */
        var inheritance = ['from', 'created_time', 'description', 'link', 'message', 'name',
                           'picture', 'type', 'author_id', 'created_seconds', 'sourceName',
                           'fb_post_id', 'orientaFonte', 'linked' ];

        mongo.forcedDBURL = 'mongodb://localhost/e18';
        return mongo
            .read('merge', { postId: extimp.postId }, { 'created_time': -1} )
            .then(function(previous) {

                if(_.size(previous)) {
                    extimp.display =_.size(previous);
                    _.extend(extimp, _.pick(previous[0], inheritance));
                    extimp.linked = true;
                } else 
                    extimp.linked = false;

                return mongo
                    .writeOne('merge', extimp)
                    .return(extimp)
                    .catch(function(error) {
                        if(error.code !== 11000) /*  'E11000 duplicate key error collection */
                            debug("Error in writeOne: %s", error.message);
                        return null;
                    });
            });

    }, {concurrency: 10})
    .tap(function(intermediary) {
        debug("linked %s", JSON.stringify( _.countBy(intermediary, 'linked'), undefined, 2));
    })
    .then(function(rv) {
        debug("xtimpression: saved %d posts (starting from %d), diff %d",
            _.size(rv), impressions.elements, impressions.elements - _.size(rv)
        );
        return {
            processed: rv,
            start: impressions.start
        };
    });
}

function specialAttributions(post) {
    // special cases: pages with the name different from the URL 
    if(post.from.id === "411675765615435") return "Fascisti uniti per L'italia";
    if(post.from.id === "325228170920721") return "Laura Boldrini";
    return "INVALIDSOURCE";
};

function FBapi(fbposts, profiles) {

    var stripFields = ['likes', 'shares', 'ANGRY', 'WOW', 'SAD', 'LOVE', 'HAHA'];
    return Promise.map(fbposts.results, function(p) {

        var rgpx = new RegExp(p.sourceName, 'i')
        p.orientaFonte = _.reduce(profiles, function(memo, bot) {
            _.each(bot.riferimenti, function(pageurl) {
                if(pageurl.match(rgpx))
                    memo = bot.orientamento;
            });
            return memo;
        }, "INVALIDSOURCE");

        if(p.orientaFonte === "INVALIDSOURCE")
            p.orientaFonte = specialAttributions(p);

        _.each(stripFields, function(emotion) {
            _.unset(p, emotion);
        });
        p.id = p.fb_post_id;
        p.display = 0;

        // only the post belonging to the text are here considered:
        //          EXTERNAL SOURCES ARE STRIPPED HERE
        //          ^^^^^^^^ ^^^^^^^ ^^^ ^^^^^^^^ ^^^^

        if(p.orientaFonte === "INVALIDSOURCE") {
            // debug("removing %j", p.from);
            return null;
        } else {
            mongo.forcedDBURL = 'mongodb://localhost/e18';
            return mongo
                .writeOne('merge', p)
                .return(p)
                .catch(function(error) {
                    if(error.code !== 11000) /*  'E11000 duplicate key error collection */
                        debug("Error in writeOne: %s", error.message);
                    return null;
                });
        }
    }, { concurrency: 10} )
    .then(_.compact)
    .tap(function(intermediary) {
        debug("sources %s dandelion: %s",
            JSON.stringify( _.countBy(intermediary, 'orientaFonte'), undefined, 2),
            JSON.stringify( _.countBy(intermediary, 'dandelion'), undefined, 2)
        );
    })
    .then(function(rv) {
        debug("FBapi: saved %d posts (starting from %d), diff %d",
            _.size(rv), fbposts.elements, fbposts.elements - _.size(rv)
        );
        return {
            processed: rv,
            start: fbposts.start
        };
    });
};

function dbByDate(day, column, timevar) {
    mongo.forcedDBURL = 'mongodb://localhost/e18';

    var startw = moment(begin).add(day, 'd').toISOString();
    var endw = moment(begin).add(day + 1, 'd').toISOString();
    var filter = _.set({}, timevar, {
        '$lte': new Date(endw),
        '$gt': new Date(startw)
    });

    return mongo
        .read(column, filter, _.set({}, timevar, -1))
        .map(function(e) {
            _.unset(e, '_id');
            return e;
        })
        .then(function(results) {
            return {
                start: moment(startw),
                end: moment(endw),
                diff: moment.duration(moment(startw) - moment()),
                elements: _.size(results),
                results: results,
                column: column,
                day: day
            };
        });
};

/* take statistics from the post received in API and from Impressions */
function saveStatistics(api, impre) {

    // split in chunks of every 5 minutes 
    _.times(24 * 12, function(minshift) {
        var lower = moment(data.start).add(minshift * 5, 'm');
        minshift += 1;
        var upper = moment(data.start).add(minshift * 5, 'm');

        var x = _.filter(api.processed, function(e) {
            return check.isBefore( moment(_.get(e, timevar)) );
        });
    });
};

/* execution start below */

debug("This script analyzes only one day per time (%s), and update the databases: `merge` `mergestats`",
    moment(begin).add(day, 'd').format("ddd DD MMM") );

return Promise.all([
    dbByDate(day, 'fbtimpre', 'impressionTime'),
    dbByDate(day, 'dibattito', 'created_time' ),
    various.loadJSONfile('fonti/utenti-exp1.json')
    // + read in mergestats
])
.then(function(mix) {
    // mix[0] is fbtimpre
    debug("Impressions are %d (the day %s -> %s), %s ago",
            mix[0].elements, mix[0].start.format("DD/MMM hh:mm"), mix[0].end.format("DD/MMM hh:mm"), mix[0].diff.humanize()
    );
    // mix[1] is dibattito
    debug("Facebook API posts are %d (the day %s -> %s), %s ago",
            mix[1].elements, mix[1].start.format("DD/MMM hh:mm"), mix[1].end.format("DD/MMM hh:mm"), mix[1].diff.humanize()
    );
    debug("Profiles are %d", _.size(mix[2]));

    // Here the sequence is importan: 
    //  before it is saved fbposts of the timewindow
    //  then are addressed the impression, so we are sure the published post of the previous day are already
    //  present. If they are not, it is a problem in our scheduled jobs or in our postId parsing
    //  after: the stats
    return FBapi(mix[1], mix[2])
        .then(function(fbapistats) {
            debug("now the FBapi posts have been saved, we'll address the impressions");
            return xtimpression(mix[0], mix[2]);
/*
                .then(function(fbtstats) {
                    return saveStatistics(fbapistats, fbtstats);
                });
                */
        });
})
.tap(function(result) {
    debug("Done!");
});
