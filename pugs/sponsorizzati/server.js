var _ = require('lodash');
var debug = require('debug')('server:sponsorizzati');
var pug = require('pug');
var nconf = require('nconf').env();

var campaignName = nconf.get('campaign');

function sponsorizzati(req) {

    var pageName = _.get(req.params, 'page');
    debug("page request for: %s", pageName);

    var fullp = __dirname + '/' + 'sponsorizzati.pug';
    return { 'text':
        pug.compileFile(fullp, {
            pretty: true,
            debug: false
        })()
    };
};

module.exports = sponsorizzati;
