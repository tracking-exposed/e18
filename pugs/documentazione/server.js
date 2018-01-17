var _ = require('lodash');
var debug = require('debug')('server:documentazione');
var pug = require('pug');
var Promises = require('bluebird');
var nconf = require('nconf').env();

var getLastObjectByType = require('../../../../routes/getLastObjectByType');

var campaignName = nconf.get('campaign');

function documentazione(req) {

    /* questa funzione usa la chiamata di "sistema" getLastObjectByType
     * e tiene in cache gli oggetti necessari. Li passa alla documentazione in 
     * modo da popolare la pagina con informazioni sempre plausibili e sempre aggiornate */

    debug("serving .pug page with cached content");
    var fullp = __dirname + '/' + 'documentazione.pug';
    var cachedOrMongo = [
        getLastObjectByType({ params: { otype: "fbtimpre" }}),
        getLastObjectByType({ params: { otype: "fbtposts" }}),
        getLastObjectByType({ params: { otype: "dibattito" }}),
        getLastObjectByType({ params: { otype: "judgment" }}),
        getLastObjectByType({ params: { otype: "entities" }})
    ]
    return Promises.all(cachedOrMongo)
        .map(function(o) {
            return o.json;
        })
        .then(function(o) {
            /* validateType of getLastObjectByType extend the object with .type */
            var x = _.groupBy(o, 'type');
            return { 'text': 
                pug.compileFile(fullp, {
                    pretty: true,
                    debug: false
                })()
            };
        });
};

module.exports = documentazione;
