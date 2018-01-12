var _ = require('lodash');
var debug = require('debug')('server:distorsioni');
var pug = require('pug');
var nconf = require('nconf').env();
var querystring = require('querystring');
var mongo = require('../../../../lib/mongo')

var collectionName = 'fbtposts';
var fullp = __dirname + '/' + 'distorsioni.pug';

function distorsioni(req) {

    var pageName = _.get(req.params, 'page');
    debug("page request for: %s", pageName);

    /* si faranno esperimenti con sharding, backup o ridondanze varie */
    mongo.forcedDBURL = 'mongodb://localhost/e18';
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
debugger;
    return mongo
        .read(collectionName, {})
        .then(function(k) {



            var tablecontent = querystring.stringify(k);
            var x = encodeURI(JSON.stringify(k));
            debugger;
            return { 'text': pug.compileFile(fullp, {
                    pretty: true,
                    debug: false
                })({
                    tablecontent: x
                })
            };
        });
};

module.exports = distorsioni;
