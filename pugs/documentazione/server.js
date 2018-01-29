var _ = require('lodash');
var debug = require('debug')('server:documentazione');
var pug = require('pug');
var Promises = require('bluebird');
var fs = Promises.promisifyAll(require('fs'));
var nconf = require('nconf').env();
var process = require('process');

var getLastObjectByType = require('../../../../routes/getObjectByType').getLastObjectByType;

var campaignName = nconf.get('campaign');

var directory = process.env.PWD + '/campaigns/e18/opendata';

var getFiles = function () {
    return Promises.map(_.times(10), function(weekn) {
        var dirpath = directory + "/" + (weekn + 1);

        return fs
            .readdirAsync(dirpath)
            .catch(function(error) {
                return [];
            })
            .map(function(anypath) {
                return dirpath + '/' + anypath;
            });
    })
    .then(_.flatten)
    .then(_.compact);
};

var getContent = function (fpath) {
    return fs
        .lstatAsync(fpath)
        .then(function(stat) {
            if(stat.isDirectory())
                return null;

            return fs
                .readFileAsync(fpath, "utf8");
        })
        .catch(function(error) {
            debug("error: %s", error.message);
            return null;
        });
};

function getOpenDataFiles() {
    return getFiles()
        .map(function (filename) {
            return _.replace(filename, /.*opendata/, 'opendata');
        });
};


function documentazione(req) {

    /* questa funzione usa la chiamata di "sistema" getLastObjectByType
     * e tiene in cache gli oggetti necessari. Li passa alla documentazione in 
     * modo da popolare la pagina con informazioni sempre plausibili e sempre aggiornate */

    var fullp = __dirname + '/' + 'documentazione.pug';
    var targets = ["fbtimpre", "fbtposts", "dibattito", "judgment", "entities"];

    return Promises
        .all(_.map(targets, _.partial(getLastObjectByType)))
        .map(function(o) {
            return encodeURI(JSON.stringify(o));
        })
        .then(function(o) {
            return getOpenDataFiles()
                .then(function(files) {
                    return [o, encodeURI(JSON.stringify(files))];
                })
        })
        .then(function(m) {
            /* validateType of getLastObjectByType extend the object with .type */
            debug("Return for download: %d files", _.size(m[1]));

            var args = _.reduce(targets, function(memo, e, i) {
                _.set(memo, e, m[0][i]);
                return memo;
            }, { files: m[1] });
            // console.log(JSON.stringify(args, undefined, 2));

            return { 'text': 
                pug.compileFile(fullp, {
                    pretty: true,
                    debug: false
                })(args)
            };
        });
};

module.exports = documentazione;
