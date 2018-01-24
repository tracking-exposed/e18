var _ = require('lodash');
var debug = require('debug')('server:statiche');
var pug = require('pug');
var Promises = require('bluebird');
var nconf = require('nconf').env();

var campaignName = nconf.get('campaign');

function statiche(req) {

    var fullp = __dirname + '/' + req.params.page + '.pug';

    /* TODO promise di salvataggio accesso */
    return { 'text': 
        pug.compileFile(fullp, {
            pretty: true,
            debug: false
        })()
    };

};

module.exports = statiche
