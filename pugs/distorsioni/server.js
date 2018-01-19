var _ = require('lodash');
var debug = require('debug')('server:distorsioni');
var pug = require('pug');
var nconf = require('nconf').env();
var moment = require('moment');
var Promise = require('bluebird');
var mongo = require('../../../../lib/mongo');
var various = require('../../../../lib/various');


/*
  { _id: { _bsontype: 'ObjectID', id: [Object] },
    postId: '1690449564331296',
    publicationTime: '2018-01-09T09:00:11Z',
    pageName: 'legasalvinipremier',
    text: 'Salvini: "Legittima difesa e espulsione clandestini. Missione compiuta"',
    appears: [ [Object] ] },
  { _id: { _bsontype: 'ObjectID', id: [Object] },
    postId: '934445423390884',
    publicationTime: '2018-01-09T09:00:09Z',
    pageName: 'NoiconSalviniUfficiale',
    text: 'Salvini: "Legittima difesa e espulsione clandestini. Missione compiuta"',
    appears: [ [Object] ] },
  { _id: { _bsontype: 'ObjectID', id: [Object] },
    postId: '10155959017347644',
    publicationTime: '2018-01-09T08:54:19Z',
    pageName: 'giorgiameloni.paginaufficiale',
    appears: [ [Object] ] },

  */

function distorsioni(req) {

    var daysago = 0;
    var collectionName = 'fbtposts';
    var fullp = __dirname + '/' + 'distorsioni.pug';
    var usersf = __dirname + '/../../fonti/utenti-exp1.json';
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
            mongo
                .readLimit(collectionName, filter, {}, 1000, 0),
            various
                .loadJSONfile(usersf)
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

            /* HTTP render */
            return {
                'text': pug.compileFile(
                            fullp,
                            { pretty: true, debug: false }
                        )({
                            postsmap: postlist,
                            users: userinfo
                })
            };
        });
};

module.exports = distorsioni;
