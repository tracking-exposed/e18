#!/usr/bin/env nodejs
var _ = require('lodash');
var moment = require('moment');
var Promise = require('bluebird');
var debug = require('debug')('e18:bin:opendata');
var fs = Promise.promisifyAll(require('fs'));

var mongo = require('../../../lib/mongo');
var supported = require('../../../routes/getObjectByType').supported;

/* this creates a nested list of promises */
var pseudopl = _.times(23, function(weekn) {
    return _.map(supported, function(specs, cname) {
        var finalt = weekn + 1;
        var min = moment({ year: 2018 }).add(weekn, 'w');
        var max = moment({ year: 2018 }).add(finalt, 'w');
        var filter = _.set({}, specs.timeVar, {
            '$gte': new Date(min.toISOString()),
            '$lt': new Date(max.toISOString())
        });

        return {
            filter: filter,
            cname: cname,
            dburl: specs.dburl,
            dates: { min: min, max: max },
            weekn: finalt,
            f: _.join(['opendata', finalt, cname + '-' + finalt+ '.json'], '/'),
            d: _.join(['opendata', finalt], '/')
        };
    });
});

/* pseudo promise list, generate a promise for every week */
return Promise
    .map(_.flatten(_.compact(pseudopl)), function(pseudo) {
        mongo.forcedDBURL = pseudo.dburl;
        return mongo
            .read(pseudo.cname, pseudo.filter) // , sorter)
            .map(function(c) {
                return _.omit(c, '_id'); 
            })
            .then(function(olist) {
                if(!_.size(olist))
                    return null;

                if(pseudo.dates.max.isAfter(moment()))
                    debug("Incomplete week detected: it will just be override like the others");

                if(pseudo.dates.min.isBefore(moment("2018-01-14"))) {
                    debug("Skipping because too early: %s", JSON.stringify(pseudo.dates, undefined, 2));
                    return null;
                }

                var savingFinal = {
                    criteria: pseudo,
                    elements: _.size(olist),
                    content: olist
                }
                debug("Saving %s", pseudo.f);
                return fs
                    .mkdirAsync(pseudo.d)
                    .catch(function(e) {})
                    .then(function() {
                        return fs
                            .writeFileAsync(pseudo.f, JSON.stringify(savingFinal, undefined, 2))
                            .then(function(result) {
                                debug("[+] %s, %d", pseudo.f, savingFinal.elements);
                                return savingFinal;
                            });
                    });
            })
            .catch(function(e) {
                debug("problem? %s with %s", e, pseudo);
            });
    }, { concurrency: 10 });

