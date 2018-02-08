#!/usr/bin/env nodejs
var _ = require('lodash');
var mongo = require('../../../lib/mongo');
var debug = require('debug')('bin:merge-entities');
var moment = require('moment');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var nconf = require('nconf');

var mongo = require('../../../lib/mongo');
var various = require('../../../lib/various');

nconf.argv().env();

function mergeColumn(o) {
    mongo.forcedDBURL = 'mongodb://localhost/e18';

    return mongo
        .read('fbtposts', { 'externals.id' : o.id })
        .then(function(post) {
            if(!post)
                return null;

            post = _.first(post);

            if(!post || !_.size(post.appears) )
                return null;

            //debug("OK %s", JSON.stringify(o, undefined, 2) );
            //debug("%s", JSON.stringify(post, undefined, 2) );

            var k =  _.reduce(post.appears, function(memo, l) { memo += _.size(l); return memo;}, 0);
            return _.map(post.appears, function(app) {
                var r = _.extend(o,
                        _.omit(app, ['id']),
                        _.pick(post, ['postId', 'publicationTime', 'pageName', 'text', 'externals', ])
                );
                r.htmlId = app.id;
                r.publicationTime = new Date(r.publicationTime);
                var orientamento = _.find(polarizzazione, { bot: r.profile });
                r.orientamento = orientamento.orientamento;
                // reminder è qui che viene sistemato il fuso orario 
                r.visualizationDiff += 3600;
                r.impressionTime = new Date(moment(r.publicationTime).add(r.visulizationDiff, 's').format());
                _.unset(r, '_id');
                return r;
            });
        })
        .then(_.compact)
        .then(_.flatten)
        .then(function(entry) {
            if(!entry || !_.size(entry))
                return null;
            mongo.forcedDBURL = 'mongodb://localhost/e18';
            return mongo
                .writeOne('entimpre', entry)
                .return(true)
                .catch(function(e) {
                    /* if(e.errmsg) debug("%s", e.errmsg); else debug("%s", e.message); */
                    return null;
                });
        })
};

function getEntities(filter) {
    mongo.forcedDBURL = 'mongodb://localhost/facebook';
    return mongo
        .read('entities', filter)
        .map(mergeColumn, { concurrency: 5})
        .tap(function(r) {
            /* if(_.reduce(r, function(memo, e) { memo = !!e || memo; return memo; }, null))
                debugger;
             */
        })

};


var begin ="2018-01-05";
var maxday = _.parseInt(nconf.get('days')) || 60;
debug("Starting since the %s days to follow up are: %d (%s)", begin,
    maxday, moment(begin).add(maxday, 'd').format("ddd DD MMM") );

var queries = _.times(maxday, function(d) {

    var startw = moment(begin).add(d, 'd').toISOString();
    var endw = moment(begin).add(d + 1, 'd').toISOString();

    return { publicationTime: {
        '$lte': new Date(endw),
        '$gt': new Date(startw)
    }};
});

var polarizzazione = [];

return various
    .loadJSONfile('fonti/utenti-exp1.json')
    .tap(function(pol) {
        polarizzazione = pol;
        return Promise
            .map(queries, getEntities, { concurrency: 6})
            .then(_.flatten)
            .then(function(results) {
                debug("Dopo .map %s", JSON.stringify(_.countBy(results), undefined, 2));
            });
    });
