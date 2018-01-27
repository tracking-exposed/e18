#!/usr/bin/env nodejs

var _ = require('lodash');
var mongo = require('../../../lib/mongo');
var various = require('../../../lib/various');
var debug = require('debug')('sorveglianza');
var Promise = require('bluebird');

/* questo script è avviato dopo bin/analyzeGroup.js, vengono presi gli ultimi link
 * scaricati e trovate le entities associate, estendendo quell'informazione in un
 * nuovo database */

mongo.forcedDBURL = 'mongodb://localhost/ivl';

return mongo
    .readLimit('judgment', {}, {when: -1}, 6, 0)
    .then(function(x) {
        debugger;
        return _.sample(x);
    })
    .then(function(entry) {
        debug("%s", JSON.stringify(entry, undefined, 2));
        return _.map(entry.ranks, function(linknfo) {
            var entitiesId = various.hash({
                'href':linknfo.name,
                'type': "original"
            });
            linknfo.entitiesId = entitiesId;
            debug("%s", entitiesId);
            return linknfo;
        });
    })

