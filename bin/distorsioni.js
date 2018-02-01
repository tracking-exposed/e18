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

function mergeOnlyIfDiff(list1, list2) {
    var idl1 = _.map(list1, 'id');
    var idl2 = _.map(list2, 'id');

    if(!(idl1 && idl2)) return null;

    if(_.size(idl1) != _.size(_.intersection(idl1, idl2))) {
        _.each(list2, function(a) {
            if(!_.find(list1, {id: a.id}))
                list1.push(a);
        });
        return list1;
    }
    return null;
};

function fixDates(element) {
    if(_.get(element, 'publicationTime'))
        element.publicationTime = new Date(element.publicationTime);
    if(_.get(element, 'impressionTime'))
        element.impressionTime = new Date(element.impressionTime);
    return element;
}

function saveIfNew(cName, element, result) {

    /* if result[0] and element exists and they have different .appears, 
     *      it should be merged and updated.
     * if result[0] and element exists and they don't differ, don't save.
     * if result don't exists, save.
     *
     * remind: this function can be used for posts and for impressions,
     * but this section is only for post: this could lead to some
     * confusion: has to be split!
     */
    if(element.appears && result[0]) {
        var merge = mergeOnlyIfDiff(element.appears, result[0].appears);
        if(merge) {
            _.set(element, 'appears', merge);
            return mongo
                .updateOne(cName, {postId: element.postId}, element)
                .return("updated");
        }
        else
            return "appearences unchanged";

    } else if(_.first(result))
        return null;
        // this make sense for impression, not for posts

    element = fixDates(element);

    return mongo
        .writeOne(cName, element)
        .return("created");
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
    .then(_.countBy)
    .tap(function(result) {
        debug("Received %d posts, %s", _.size(content), JSON.stringify(result, undefined, 2));
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

