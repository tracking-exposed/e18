var _ = require('lodash');
var debug = require('debug')('server:distorsioni');
var pug = require('pug');
var nconf = require('nconf').env();

var campaignName = nconf.get('campaign');


function distorsioni(req) {

    var pageName = _.get(req.params, 'page');
    debug("page request for: %s", pageName);

    var fullp = __dirname + '/' + 'distorsioni.pug';
    return { 'text': 
        pug.compileFile(fullp, {
            pretty: true,
            debug: false
        })()
    };
};

module.exports = distorsioni;
