var _ = require('lodash');
var debug = require('debug')('server:distorsioni');
var pug = require('pug');
var nconf = require('nconf').env();

var campaignName = nconf.get('campaign');

var pugCompiler = function(filePath) {
    return pug.compileFile(
        __dirname + filePath, {
            pretty: true,
            debug: false
        }
    );
};

function distorsioni(req) {

    var pageName = _.get(req.params, 'page');
    debug("page request for: %s", pageName);

    return { 'text': pugCompiler('./distorsioni.pug')() };
};

module.exports = distorsioni;
