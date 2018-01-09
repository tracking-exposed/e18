#!/usr/bin/env nodejs
var _ = require('lodash');
var Promise = require('bluebird');
var moment = require('moment');
var nconf = require('nconf');
var debug = require('debug')('distorsioni');
var request = Promise.promisifyAll(require('request'));

var mongo = require('../../../lib/mongo');
var various = require('../../../lib/various');

nconf.argv().env().file({'file': 'config/distorsioni.json' });

var source = nconf.get('source');
var start = _.parseInt(nconf.get('start')) || 3;
var end = _.parseInt(nconf.get('end')) || 0;

function saveIfNew(cName, element) {
    return mongo.read(cName, { id: element.id })
        .then(function(exists) {
            if(_.get(exists, 'id') !== element.id)
                return mongo
                    .writeOne(cName, element)
                    .return(true);
            else
                return null;
        });
};

function saveImpressions(content) {
    return Promise.map(content, function(element) {
        return saveIfNew( nconf.get('schema').fbtimpre, element);
    }, { concurrency: 5})
    .then(_.compact)
    .then(_.size)
    .tap(function(saved) {
        debug("Received %d impressions, saved %d new", _.size(content), saved);
    });
}

function savePosts(content) {
    return Promise.map(content, function(element) {
        return saveIfNew( nconf.get('schema').fbtposts, element);
    }, { concurrency: 5})
    .then(_.compact)
    .then(_.size)
    .tap(function(saved) {
        debug("Received %d posts, saved %d new", _.size(content), saved);
    });
}

var server = nconf.get('server') || 'http://localhost:8000';
var url = [ server, 'api', 'v1', 'reducer', 1, nconf.get('key'), start, end ].join('/');
debug("Connecting to [%s]", url);

return request
    .getAsync(url)
    .then(function(response) {
        return JSON.parse(response.body);
    })
    .then(function(composite) {
        return Promise.all([
                saveImpressions(composite.impressions),
                savePosts(composite.posts)
        ]);
    })
    .catch(function(e) {
        debug("Error: %s", JSON.stringify(e, undefined, 2));
    });

