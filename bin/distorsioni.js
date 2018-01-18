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

function saveIfNew(cName, element, result) {
    if(_.first(result))
        return null;
    if(_.get(element, 'publicationTime'))
        element.publicationTime = new Date(element.publicationTime);
    if(_.get(element, 'impressionTime'))
        element.impressionTime = new Date(element.impressionTime);
    return mongo
        .writeOne(cName, element)
        .return(true);
};

function saveImpressions(content) {
    var impressionSaver = _.partial(saveIfNew, nconf.get('schema').fbtimpre);
    return Promise.map(content, function(element) {
        var iSaver = _.partial(impressionSaver, element);
        return mongo
            .read( nconf.get('schema').fbtimpre, { id: element.id })
            .then(iSaver);
    }, { concurrency: 5})
    .then(_.compact)
    .then(_.size)
    .tap(function(saved) {
        debug("Received %d impressions, saved %d new", _.size(content), saved);
    });
}

function savePosts(content) {
    var postSaver = _.partial(saveIfNew, nconf.get('schema').fbtposts);
    return Promise.map(content, function(element) {
        var pSaver = _.partial(postSaver, element);
        return mongo
            .read( nconf.get('schema').fbtposts, { postId: element.postId })
            .then(pSaver);
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
        debug("timewindow: %j", composite.timewindow);
        return Promise.all([
                saveImpressions(composite.impressions),
                savePosts(composite.posts)
        ]);
    })
    // accedere al DB selezionando i post delle ultime 24 ore
    // ordinare per interazioni/visibilità
    // fare aggregato da usarsi in `distorsioni`
    .catch(function(e) {
        debug("Error: %s", e.message);
    });

