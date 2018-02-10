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

var DEBSPLI = _.parseInt(nconf.get('D')) || 500;

/* This function just generate links from entitities (via id) posts -> impressionId */
var absolute = 0;
var produced = 0;
function entitiesLink(o, i) {
    mongo.forcedDBURL = 'mongodb://localhost/e18';

    absolute++;
    if(!(absolute % DEBSPLI))
        console.log("-- entities processed", absolute, "times, produced", produced, "links");

    return mongo
        .read('fbtposts', { 'externals.id' : o.id })
        .then(function(posts) {

            var links = _.map(_.map(_.flatten(_.map(posts, 'appears')), 'id'), function(impreId) {
                return {
                    impressionId: impreId,
                    externalId: o.id,
                    url: o.url,
                    original: o.original,
                    labels: _.map(o.annotations, 'label'),
                    message: o.message,
                    dandelion: !!_.size(o.annotations)
                };
            });

            if(_.size(links))
                produced += _.size(links);

            return links;
        });
};


var begin ="2018-01-10";
var maxday = _.parseInt(nconf.get('days')) || 30;
debug("Starting since the %s days to follow up are: %d (%s)", begin,
    maxday, moment(begin).add(maxday, 'd').format("ddd DD MMM") );

var queries = _.times(maxday, function(d) {
    var startw = moment(begin).add(d, 'd').toISOString();
    var endw = moment(begin).add(d + 1, 'd').toISOString();
    return { publicationTime: {
        '$lte': new Date(endw),
        '$gt': new Date(startw)
    }};
});

var attempted = 0;
var actuallyfound = 0;
function getEntities(filter) {
    mongo.forcedDBURL = 'mongodb://localhost/facebook';

    return mongo
        .read('entities', filter)
        .map(entitiesLink, { concurrency: 4})
        .then(_.flatten)
        .tap(function(links) {
            debug("generated links between entities->post->impression.id took since the day %s\t[%s] %d",
                moment(filter.publicationTime["$lte"]).format("DD/MMMM"),
                moment.duration(moment() - moment(filter.publicationTime["$lte"])).humanize(),
                _.size(links)
            );
        })
};

function writeData(destDb, destCname, entry) {
    mongo.forcedDBURL = destDb;
    return mongo
        .writeMany(destCname, entry)
        .then(function(res) {
            debug("writeMany success: %d entries", _.size(entry));
            return _.size(entry);
        })
        .catch(function(e) {
            debug("writeMany error: \t%d\t%s", _.size(entry), e.errmsg ? "1: " + e.errmsg : "2: " + e.message);
            return 0;
        })
};

var polarizzazione = [];
var fromFB = [];
var saveEntImpre = _.partial(writeData, 'mongodb://localhost/e18', 'entimpre');

return various
    .loadJSONfile('fonti/utenti-exp1.json')
    .then(function(pol) {
        polarizzazione = pol;
        mongo.forcedDBURL = 'mongodb://localhost/e18';
        var startw = new Date(moment(begin).toISOString());
        var endw = new Date(moment(begin).add(maxday + 2, 'd').toISOString());
        // TODO: created time diventa un index
        return mongo
            .read('dibattito', { created_time: { "$lte": endw, "$gte": startw }}, { created_time: -1});
    })
    .tap(function(res) {
        debug("Acquired unfiltered reading of `dibattito` column %d [%s - %s]",
            _.size(res), _.first(res).created_time, _.last(res).created_time);
    })
    .map(function(ap) {
        ap.publicationTime = new Date(ap.created_time);
        return ap;
    })
    .then(function(apis) {
        fromFB = apis;
        return Promise
            .map(queries, getEntities, { concurrency: 3})
            .then(_.flatten)
            .tap(function(res) {
                debug("all the links generated entities->post->impression.id are %d", _.size(res));
            })
    })
    .map(function(link) {
        mongo.forcedDBURL = 'mongodb://localhost/e18';
        return mongo
            .read('fbtimpre', { id: link.impressionId })
            .then(_.first)
            .then(function(impre) {

                attempted++;
                if(!(attempted % DEBSPLI))
                    console.log("++ impressions accessed", attempted);

                var r = _.merge(
                    _.pick(link, ['externalId', 'dandelion', 'url', 'original', 'labels', 'message' ]),
                    _.omit(impre, [ '_id'])   // id is htmlId
                );

                r.orientamentoBot = _.find(polarizzazione, { bot: impre.profile }).orientamento;
                r.publicationTime = new Date(impre.publicationTime);
                r.impressionTime = new Date(impre.impressionTime);

                return r;
            })
            .catch(function(error) {
                debug("Error caught %s (%j)", error.message, link);
            });
    }, { concurrency: 10 })
    .then(function(impreent) {

        var nonviz = _.reduce(fromFB, function(memo, p) {
            var check = _.find(impreent, { postId: p.postId });
            // if a post is found, should get linked in `visualized` below
            if(check)
                return memo;

            p.visualized = false;
            p.linked = false;
            /*
             --------------------------------------------------------------
            p.orientaFonte = _.reduce(polarizzazione, function(memo, bot) {
                _.each(bot.riferimenti, function(pageurl) {
                    var rgpx = new RegExp("/" + p.sourceName + "/i")
                    if(pageurl.match(rgpx)) {
                        debug("prima volta associato da [%s] a [%s]", memo, bot.orientamento);
                        memo = bot.orientamento;
                    }
                });
                return memo;
            }, "non attribuito");                                        */

            _.each(['ANGRY', 'WOW', 'SAD', 'LOVE', 'HAHA'], function(emotion) {
                _.unset(p, emotion);
            });
            p.id = p.fb_post_id;

            memo.push(p);
            return memo;
        }, []);

        debug("First selection done, FBapi posts avail %d, not visualized %d", _.size(fromFB),_.size(nonviz));

        var visualized = _.map(impreent, function(ie) {
            var tru = _.find(fromFB, { postId: ie.postId });
            if(tru) {
                _.each(['ANGRY', 'WOW', 'SAD', 'LOVE', 'HAHA'], function(emotion) {
                    _.unset(tru, emotion);
                });
                return _.merge(ie, tru, { visualized: true, linked: true });
            }
            else
                return _.merge(ie, { visualized: true, linked: false });
        });

        debug("impreent (visualized) %d linked %s",
            _.size(visualized), JSON.stringify(_.countBy(visualized, 'linked'), undefined, 2));

        return _.orderBy(_.concat(visualized, nonviz), 'publicationTime', 'Asc');
    })
    .map(function(e) {
        e.when = new Date();
        _.unset(e, '_id');
        return e;
    })
    .then(function(x) {
        debug("Merged resuls %d splitting in %d chunks", _.size(x), _.size(x) / 1000);
        return saveEntImpre(x);
    });
