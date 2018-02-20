var _ = require('lodash');
var debug = require('debug')('server:sorveglianza');
var pug = require('pug');
var nconf = require('nconf').env();
var moment = require('moment');
var Promise = require('bluebird');
var mongo = require('../../../../lib/mongo');

var various = require('../../../../lib/various');

var campaignName = nconf.get('campaign');

function sorveglianza(req) {

    var daysago = nconf.get('daysago') ? _.parseInt(nconf.get('daysago')) : 0;

    mongo.forcedDBURL = 'mongodb://localhost/ivl';
    var pugName = 'sorveglianza';
    pugName += _.endsWith(_.get(req.params, 'page'), '-tabella') ? '-tabella.pug' : '.pug';
    var fullp = __dirname + '/' + pugName;

    return mongo
        .readLimit('judgment', {}, { when: -1}, 1, 0)
        .then(_.first)
        .then(function(report) {
            report.compagnieUniche = _.size(_.uniq(_.flatten(_.map(report.ranks, 'c'))));
            return {
                'text': pug.compileFile(
                            fullp,
                            { pretty: true, debug: false }
                        )({
                            data: encodeURI(JSON.stringify(report))
                        })
            };
        });
};

module.exports = sorveglianza;
