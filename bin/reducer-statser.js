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
        "grouped by postId"
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

function countByBot(impression, i) {
    var keptfields = [ 'pageName', 'profile', 'postId', 'impressionTime', 'publicationTime',
                       'visualizationDiff', 'type', 'impressionOrder', 'id', 'permaLink',
                       'timelineId', 'orientaBot' ];

    return mongo
        .count(cName, { postId: impression.postId, profile: impression.profile, id: { "$ne": impression.id } })
        .then(function(count) {

            var entry = _.pick(impression, keptfields);
            entry.observed = (count + 1);

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

mongo.forcedDBURL = composeDBURL('e18');
return mongo
    .read('merge', filter)
    .tap(stageDebug)
    .map(countByBot, { concurrency: 1})
    .then(_.compact)
    .tap(stageDebug)
    .tap(function() {
        debug("overwrite being used %d times", OVERWRITEUSED);
    });
