var _ = require('lodash');
var debug = require('debug')('server:sponsorizzati');
var pug = require('pug');
var nconf = require('nconf').env();
var moment = require('moment');
var Promise = require('bluebird');
var mongo = require('../../../../lib/mongo');
var various = require('../../../../lib/various');


function sponsorizzati(req) {

    var daysago = nconf.get('daysago') ? _.parseInt(nconf.get('daysago')) : 0;
    var pugName = 'sponsorizzati';
    pugName += _.endsWith(_.get(req.params, 'page'), '-tabella') ? '-tabella.pug' : '.pug';
    var fullp = __dirname + '/' + pugName;

    mongo.forcedDBURL = 'mongodb://localhost/e18';

    var min = moment().subtract(daysago +3, 'd').format("YYYY-MM-DD HH:mm:00");
    var max = moment().subtract(daysago +0, 'd').format("YYYY-MM-DD HH:mm:00");
    var filter = {
        savingTime: { '$gt': new Date(min), '$lt': new Date(max) }
    };

    return mongo
        .readLimit('sponsored', filter, {}, 300, 0)
        .then(function(content) {
            /* HTTP render */
            return {
                'text': pug.compileFile(
                            fullp,
                            { pretty: true, debug: false }
                        )({
                            data: encodeURI(JSON.stringify(content))
                })
            };
        })
};

module.exports = sponsorizzati;

