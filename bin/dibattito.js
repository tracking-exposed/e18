#!/usr/bin/env nodejs

var mongo = require('../../../lib/mongo');
var debug = require('debug')('dibattito');
var _ = require('lodash');
var Promise = require('bluebird');
