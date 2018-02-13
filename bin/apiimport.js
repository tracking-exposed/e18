#!/usr/bin/env nodejs
var _ = require('lodash');
var moment = require('moment');
var Promise = require('bluebird');
var debug = require('debug')('bin:apiimport');
var fs = Promise.promisifyAll(require('fs'));
var CSV = require('csv-string');
var glob = require('glob');
var various = require('../../../lib/various');
var mongo = require('../../../lib/mongo');
var nconf = require('nconf');

/*  
 *  { "unique" : true }
 *  { "fb_post_id" : 1 }
 */

nconf.argv().env();

function importPostsFile(fp) {
    var savingO = _.reduce(fp.content, function(memo, e) {

        var check = moment(e.created_time);
        if(check.isBefore(moment("2018-01-05")))
            return memo;

        var combo = _.split(e.id, '_');
        e.created_time = new Date(e.created_time);
        e.author_id = combo[0];
        e.postId = combo[1];
        e.created_seconds = moment(e.created_time).valueOf();
        e.sourceName = _.split(fp.fname, '/').pop().replace(/\.json$/, '');
        e.fname = fp.fname;
        e.fb_post_id = e.id;
        _.unset(e, 'id');

        memo.push(e);
        return memo;
    }, []);

    if(!_.size(savingO)) {
        debug("file %s gave as usable only 0 elements!", fp.fname);
        return null;
    }

    mongo.forcedDBURL = 'mongodb://localhost/e18';
    return Promise.map(savingO, function(o) {
        return mongo
            .writeOne('dibattito', o)
            .then(function(r) {
                return { fname: fp.fname, result: true };
            })
            .catch(function(e) {
                return { fname: fp.fname, result: false };
            });
    }, {concurrency: 10})
    .then(function(rlist) {
        if(_.size(rlist))
            debug("File %s: %j", rlist[0].fname, _.countBy(rlist, 'result'));
        else
            debug("File %s: zero object processed", fp.fname);
    });
}

var source = nconf.get('source');
debug("Welcome: it begin reading from `source` directroy: [%s]", source);

return glob(source + '/**/*.json', function(error, jsonfl) {

    return Promise.map(jsonfl, function(jsonf) {
        return various
            .loadJSONfile(jsonf)
            .then(function(content) {
                return {
                    fname: jsonf,
                    content: content
                };
            })
            .then(importPostsFile)
	    .catch(function(error) {
		debug("Error (.loadJSONfile) %s %s", jsonf, error.message);
		return null;
	    })
    }, {concurrency: 1})
    .then(_.compact);

});
