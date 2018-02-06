#!/usr/bin/env nodejs

var mongo = require('../../../lib/mongo');
var debug = require('debug')('e18:bin:sponsorizzati');
var _ = require('lodash');
var nconf = require('nconf');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));

nconf.argv().env();

var hoursago = nconf.get('hoursago') ? _.parseInt(nconf.get('hoursago')) : 0;
var server = nconf.get('server') || 'http://localhost:8000';
var url = [ server, 'api', 'v1', 'metaxpt', 'IT', 'sponsored', hoursago ].join('/');
debug("Connecting to [%s]", url);

return request
    .getAsync(url)
    .then(function(response) {
        return JSON.parse(response.body);
    })
    .then(function(response) {
        debug("Retrieved %d sponsored since %s to %s",
                _.size(response.results),
                response.queryInfo.times[0],
                response.queryInfo.times[1]
        );
        if(!_.size(response.results))
            return;

        mongo.forcedDBURL = 'mongodb://localhost/e18';
        var content = _.map(response.results, function(e) {
            e.timeId = response.queryInfo.timeId;
            e.savingTime = new Date(e.savingTime);
            return e;
        });

        /* enforced server side with unique index:
         * { "savingTime" : 1, "titleId" : 1 } */
        return mongo
            .writeMany('sponsored', content)
            .then(function() {
                debug("Writing in `sponsored` completed");
            });
    });
