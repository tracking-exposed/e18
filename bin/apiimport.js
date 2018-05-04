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

/*  *  { "unique" : true }, { "fb_post_id" : 1 } */

nconf.argv().env();

var TRANSLATE = {
    'Destra': 'right',
    'Fascistoidi': 'far-right',
    'Sinistra': 'left',
    'Centro Sinistra': 'center-left',
    'non orientato': 'undecided',
    'M5S': 'M5S'
};

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

        var sourceName = _.split(fp.fname, '/').pop().replace(/\.json$/, '');
        var ref = _.find(fp.pages, function(p) { return _.endsWith(p.pageURL, sourceName); });

        if(!ref || !TRANSLATE[ref.orientamento])
            return memo;

        e.publisherOrientation = TRANSLATE[ref.orientamento];
        e.publisherName = ref.displayName;
        e.fb_post_id = e.id;
        _.unset(e, 'id');

        memo.push(e);
        return memo;
    }, []);

    if(!_.size(savingO)) {
        debug("file %s gave as 0 meaningful elements!", fp.fname);
        return null;
    }

    mongo.forcedDBURL = 'mongodb://localhost/e18';
    return Promise.map(savingO, function(o) {
        return mongo
            .writeOne('rawposts', o)
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
if(!source) {
    console.log("`source` option mandatory, is a directory like 'collected/2018-02-10'");
    process.exit(1);
}
debug("Welcome: it begin reading ALL the files matching %s/**/*.json", source);

// TODO associare da qui il valore 'orientaSource' 
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
            .tap(function(info) {

                return various
                    .loadJSONfile("./fonti/pagine-exp1.json")
                    .then(function(pages) {

                        info.pages = pages;
                        return importPostsFile(info);
                    });
            })
            .catch(function(error) {
                debug("Error (.loadJSONfile) %s %s", jsonf, error.message);
                return null;
            });

    }, {concurrency: 1})
    .tap(function(x) { debug("¹ %d", _.size(x)); })
    .then(_.compact)
    .tap(function(x) { debug("² %d", _.size(x)); });
});
