'use strict';

var typewise = require('../typewise');
var util = require('./util');

var sample = util.getSample();
var shuffled = util.shuffle(sample.slice());
typewise.equal(sample, shuffled.sort(typewise.compare));

var sample = util.getArraySample(2);
var shuffled = util.shuffle(sample.slice());
typewise.equal(sample, shuffled.sort(typewise.compare));
