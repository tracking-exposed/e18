#!/usr/bin/env nodejs

var mongo = require('../../../lib/mongo');
var debug = require('debug')('dibattito');
var moment = require('moment');
var _ = require('lodash');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

var nconf = require('nconf');

var mongo = require('../../../lib/mongo');
var various = require('../../../lib/various');

nconf.argv().env().file({'file': 'config/dibattito.json' });

var source = nconf.get('source');
var daysago = _.parseInt(nconf.get('daysago')) || 0;

function saveAll(content) {
    debug("Saving %d posts", _.size(content));
    return mongo
        .writeMany(nconf.get('schema').dibattito, content);
    
}

function removeExisting(post) {
    return mongo
        .remove(nconf.get('schema').dibattito, { postId: post.postId })
        .return(post);
}


var sourcePath = path.join(source, moment().subtract(daysago, 'd').format("YYYY-MM-DD"));

debug("Buiding path based on [%s], daysago %d => %s", source, daysago, sourcePath);

return fs
    .readdirAsync(sourcePath)
    .reduce(function(memo, filename) {
        if(_.endsWith(filename, '.json'))
            memo.push(filename);
        return memo;
    }, [])
    .map(function(jsonf) {
        return various
            .loadJSONfile(path.join(sourcePath, jsonf))
            .reduce(function(memo, post) {
                post.pageName = jsonf.replace(/\.json/, '');
                post.author_id = _.split(post.id, '_')[0];
                post.postId = _.split(post.id, '_')[1];
                _.unset(post, 'id');

                if(moment(post.created_time).isAfter(moment({year: 2018})))
                    memo.push(post);
                return memo;
            }, []);
    })
    .then(_.flatten)
    .tap(function(x) {
        debug("After filter and flatten: %d post units", _.size(x));
    })
    .map(removeExisting, { concurrency: 5})
    .tap(saveAll);

