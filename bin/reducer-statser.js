#!/usr/bin/env nodejs
var _ = require('lodash');
var mongo = require('../../../lib/mongo');
var debug = require('debug')('bin:reducers-statser');
var moment = require('moment');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var nconf = require('nconf');

var mongo = require('../../../lib/mongo');
var various = require('../../../lib/various');

nconf.argv().env();

var cName = 'perspectives';

/* to be moved in a library: shared with merge-all */
function composeDBURL(dbname) {
    var host = nconf.get('mongodb');
    if(!host) host= 'localhost';
    return 'mongodb://' + host  + '/' + dbname;
};

/* this has to be stabilized */
var stageCounter = 0;
function stageDebug(content) {
    var stages = [
        "read from `merge` table",
        "grouped by postId, stripped the alien pages"
    ];
    var message = _.get(stages, stageCounter);
    debug(" [+stage %d] %s: %d", stageCounter, message, _.size(content));
    stageCounter++;
}

/* library probably */
function overwrite(element) {
    var targetId = element.id;

    return mongo
        .remove(cName, { id: targetId })
        .then(function() {
            return mongo
                .writeOne(cName, element)
                .then(function() {
                    OVERWRITEUSED++;
                    return element;
                })
                .catch(function(error) {
                    debug("Error in overwrite/writeOne: %s", error.message);
                    return null;
                });
        })
        .catch(function(error) {
            debug("Error in overwrite/remove: %s", error.message);
            return null;
        });
};

/* 
 * this script produced a reducer of `merge`:
 *   - take as input a window of days (begin date and delta)
 *   - keep only the bot impressions (select by not display 0)
 *   - uniquify the postId
 *   - find each postId
 *   - attribute a proper display order per bot
 *   - save on `perspectives` table
 */

var FORCEWRITE = !_.isUndefined(nconf.get('FORCEWRITE'));
var OVERWRITEUSED = 0;
var pages = [];

var begin = nconf.get('begin');
var days = _.parseInt(nconf.get('days'));
if(!begin || !days) {
    console.log("required variables are `begin`=YYYY-MM-DD and `days` (number of day to cover)");
    process.exit(1);
}

var start = moment(begin).startOf('day');
var end = moment(begin).startOf('day').add(days, 'd');

if(!start.isValid() || !end.isValid()) {
    console.log("Invalid `begin` or `days` variable, unable to create a valid momentjs");
    process.exit(1);
}

var filter = {
    impressionTime: { "$gte": new Date(start.format()), "$lt": new Date(end.format()) },
    display: { "$ne": 0 }
};

PROT = 0;
function countByBot(impression, i) {
    var keptfields = [ 'pageName', 'profile', 'postId', 'impressionTime', 'publicationTime',
                       'visualizationDiff', 'type', 'impressionOrder', 'id', 'permaLink',
                       'timelineId', 'orientaBot' ];

    return mongo
        .count(cName, { postId: impression.postId, profile: impression.profile, id: { "$ne": impression.id } })
        .then(function(count) {

            var entry = _.pick(impression, keptfields);
            entry.observed = (count + 1);

            if(_.startsWith(impression.pageName, 'permalink'))
                var refcheck = impression.pageName.replace(/.*id=/, '');
            else
                var refcheck = impression.pageName;

            var ref = _.find(pages, function(p) { return _.endsWith(p.pageURL, refcheck); });

            if(ref) {
                if(impression.from) {
                    if( !impression.orientaFonte || !impression.from.name ||
                        !_.size(impression.orientaFonte) || !_.size(impression.from.name) ) {
                        debug("condition (1) match, check https://www.facebook.com%s", impression.permaLink);
                        debugger;
                        return null;
					}
                    entry.publisherName = impression.from.name;
                    entry.orientaFonte = impression.orientaFonte;
                } else  {
                    // linked false and page not linked, such as CASE-1 below, that's why _.find as _.endsWith
                    entry.publisherName = ref.displayName;
                    entry.orientaFonte = ref.orientament;
                }
            } else {
                debug("condition (2) match, check https://www.facebook.com%s", impression.permaLink);
                debugger;
                return null;
            }

            return mongo
                .writeOne(cName, entry)
                .return(entry)
                .catch(function(error) {
                    if(error.code !== 11000) /*  'E11000 duplicate key error collection */
                        debug("Error in writeOne: %s", error.message);
                    else
                        if(FORCEWRITE)
                            return overwrite(entry);
                    return null;
                });
        });
};


return various
    .loadJSONfile('./fonti/pagine-exp1.json')
    .then(function(p) {
        pages = p;

        mongo.forcedDBURL = composeDBURL('e18');
        return mongo
            .read('merge', filter)
            .tap(stageDebug)
            .map(countByBot, { concurrency: 1})
            .then(_.compact)
            .tap(stageDebug)
            .tap(function() {
                if(FORCEWRITE)
                    debug("overwrite being used %d times", OVERWRITEUSED);
            });
    });

/*
 * CASE-1
{ pageName: '325228170920721',
  profile: 'Antonietta',
  postId: '1495089873934539',
  impressionTime: 2018-02-22T20:07:09.000Z,
  publicationTime: 2018-02-22T11:37:19.000Z,
  visualizationDiff: 30590,
  type: 'photo',
  love: 70,
  like: 718,
  sad: 0,
  haha: 0,
  wow: 4,
  angry: 0,
  thankful: 0,
  impressionOrder: 32,
  id: '22bcdd6340eb8133555e8c0c78a7dd2b2ae6872f',
  permaLink: '/325228170920721/photos/a.474064812703722.1073741827.325228170920721/14950898739... (length: 93)',
  rtotal: '792',
  comments: '81',
  shares: '79',
  timelineId: '4e89f5abcd2e13de5e7d553cfe6be16e99891b68',
  orientaBot: 'Sinistra',
  linked: false }
 */
