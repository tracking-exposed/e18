#!/usr/bin/env nodejs
var _ = require('lodash');
var mongo = require('../../../lib/mongo');
var debug = require('debug')('bin:label-extractor');
var moment = require('moment');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var nconf = require('nconf');

var mongo = require('../../../lib/mongo');
var various = require('../../../lib/various');

nconf.argv().env();

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
 * this script produced a JSON file with these fields:
 *
 * description: "A string describing what it is",
 * bucket: [ {
 *  "profile": "Mina",
 *  "labels": [
 *      [ "Celentano", "Celentano", "Celentano", "Celenterato" ],
 *      [ "Altro", "Altro ancora" ]
 *  ]
 * }, {
 *  "profile": "Fabrizio de Andrè",
 *  "labels": [
 *      [ "Bocca di rosa", "Citta vecchia", "Canzone del Maggio", "Bombarolo" ],
 *      [ "Bocca ", "Altro", "Canzone ", "Bomba" ]
 *  ]
 * }]
 *
 * input REQUIRED
 *      begin=YYYY-MM-DD
 *      days=N
 *      out="name"
 */

var begin = nconf.get('begin');
var days = _.parseInt(nconf.get('days'));
if(!begin || !days) {
    console.log("required variables are `begin`=YYYY-MM-DD and `days` and `out`.json");
    process.exit(1);
}
var start = moment(begin).startOf('day');
var end = moment(begin).startOf('day').add(days, 'd');

if(!start.isValid() || !end.isValid()) {
    console.log("Invalid `begin` or `days` variable, unable to create a valid momentjs");
    process.exit(1);
}
var outf = nconf.get('out');
if(!_.endsWith(outf, '.json')) {
    console.log("Invalid `out` has to end with .json");
    process.exit(1);
}

var filter = {
    impressionTime: { "$gte": new Date(start.format()), "$lt": new Date(end.format()) },
    dandelion: true
};

/* to be moved in a library: shared with merge-all */
function composeDBURL(dbname) {
    var host = nconf.get('mongodb');
    if(!host) host= 'localhost';
    return 'mongodb://' + host  + '/' + dbname;
};

function getLabels(impression, i) {
    return _.pick(impression, ['profile', 'orientaBot', 'url', 'externalId', 'labels']);
};

mongo.forcedDBURL = composeDBURL('e18');
return mongo
    .read('merge', filter)
    .tap(stageDebug)
    .map(getLabels, { concurrency: 30 })
    // .then(accorpate)
    .tap(stageDebug)
    .then(function(content) {
        return fs
            .writeFileSync(outf, JSON.stringify(content, undefined, 2), 'utf-8');
    })
    .tap(function() {
        debug("Written %s", outf);
        console.log("done");
    });
