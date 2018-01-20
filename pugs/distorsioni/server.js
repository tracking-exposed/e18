var _ = require('lodash');
var debug = require('debug')('server:distorsioni');
var pug = require('pug');
var nconf = require('nconf').env();
var moment = require('moment');
var Promise = require('bluebird');
var mongo = require('../../../../lib/mongo');
var various = require('../../../../lib/various');

function distorsioni(req) {

    var daysago = 0;
    var collectionName = 'fbtposts';
    var fullp = __dirname + '/' + 'distorsioni.pug';
    var usersf = __dirname + '/../../fonti/utenti-exp1.json';
    var pagef = __dirname + '/../../fonti/pagine-exp1.json';
    mongo.forcedDBURL = 'mongodb://localhost/e18';

    /* anzichè accedere a posts si dovrebbe prendere un merge di:
     * i post pubblicati nel range 24 ore - 48 ore fa
     * ordinati per maggiore engagement (oppure)
     * ordinati per avere un post per fonte
     * scaricata immagine di preview
     * analisi semantica
     * analisi dei trackers
     * analisi delle fonti per mostrare la "competizione"
     * tutto insieme a creare questo pacchetto informativo
     */
    var min = moment().subtract(daysago +2, 'd').format("YYYY-MM-DD");
    var max = moment().subtract(daysago +1, 'd').format("YYYY-MM-DD");
    var filter = {
        publicationTime: { '$gt': new Date(min), '$lt': new Date(max) }
    };

    return Promise.all([
            mongo.readLimit(collectionName, filter, {}, 1000, 0),
            various.loadJSONfile(usersf),
            various.loadJSONfile(pagef)
        ])
        .then(function(mix) {

            /* posts */
            debug("With a maximum posts of 1000, retrieved %d", _.size(mix[0]));

            /* select pages, only the first 15 producers */
            var pageSelected = _.take(_.orderBy(_.map(_.countBy(mix[0], 'pageName'), function(occ, pageName) {
                return { occurrency: occ, pageName: pageName };
            }), 'occurrency', 'desc'), 15);

            /* pick the most five seen posts for every page */
            var topinteracted = _.reduce(_.groupBy(mix[0], 'pageName'), function(memo, l, p) {
                var c = {
                    posts: _.take(_.orderBy(l, function(o) { return _.size(o.appears); }, 'desc'), 5),
                    pageName: p,
                    totals: _.size(l)
                }
                memo.push(c);
                return memo;
            }, []);

            /* keep only the posts selected belonging to the right pages */
            var selection = _.filter(topinteracted, function(o) {
                return _.find(pageSelected, { pageName: o.pageName });
            });

            var postlist = encodeURI(JSON.stringify(selection));

            /* users */
            var userinfo = encodeURI(JSON.stringify(mix[1]));
            /* pages */
            var pageinfo = encodeURI(JSON.stringify(mix[2]));

            /* HTTP render */
            return {
                'text': pug.compileFile(
                            fullp,
                            { pretty: true, debug: false }
                        )({
                            posts: postlist,
                            users: userinfo,
                            pages: pageinfo
                })
            };
        });
};

module.exports = distorsioni;
