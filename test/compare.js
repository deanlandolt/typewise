'use strict';

var typewise = require('../typewise');
var util = require('./util');
var tape = require('tape');

tape('simple', function (t) {
  try {
    var sample = util.getSample();
    var shuffled = util.shuffle(sample.slice());
    typewise.equal(sample, shuffled.sort(typewise.compare));
    t.deepEqual(sample, shuffled.sort(typewise.compare));
    var sample = util.getArraySample(2);
    var shuffled = util.shuffle(sample.slice());
    typewise.equal(sample, shuffled.sort(typewise.compare));
    t.deepEqual(sample, shuffled.sort(typewise.compare));
  }
  catch (err) {
    t.notOk(err);
    console.log(err.stack || err);
  }
  t.end()
})
