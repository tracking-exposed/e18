var _ = require('lodash');
var debug = require('debug')('server:documentazione');
var pug = require('pug');
var Promises = require('bluebird');
var nconf = require('nconf').env();

var getLastObjectByType = require('../../../../routes/getObjectByType').getLastObjectByType;

var campaignName = nconf.get('campaign');

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
            /* validateType of getLastObjectByType extend the object with .type */
            return { 'text': 
                pug.compileFile(fullp, {
                    pretty: true,
                    debug: false
                })(_.reduce(targets, function(memo, e, i) {
                    _.set(memo, e, o[i]);
                    return memo;
                }, {}))
            };
        });
};

module.exports = documentazione;
