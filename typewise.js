'use strict';
require('es6-shim');

var isBinary = require('bops').is;

var typewise = exports;

function getValue(source) {
  return source == null ? source : source.valueOf();
}

var typeOrder = [
  'undefined',
  'null',
  'boolean',
  'number',
  'date',
  'binary',
  'string',
  'set',
  'array',
  'object',
  'map',
  'regexp',
  'function'
];

var compare = typewise.compare = function(aSource, bSource) {
  // Error objects are incomparable
  if (aSource instanceof Error || bSource instanceof Error) return;

  // Unbox possible values to primitives before any NaN checks
  var aValue = getValue(aSource);
  var bValue = getValue(bSource);

  // NaN and Invalid Date are incomparable
  if (aValue !== aValue || bValue !== bValue) {
    throw new TypeError('Cannot compare: ' + aSource + ' to ' + bSource);
  }

  // Cache typeof for both values
  var aType = typeof aSource;
  var bType = typeof bSource;
  // Loop over type tags and attempt compare
  for (var i = 0, length = typeOrder.length; i < length; ++i) {
    var type = typewise.types[typeOrder[i]];
    if (type.is(aSource, aType)) {
      // If b is the same as a then defer to the type's comparator, otherwise a comes first
      return type.is(bSource, bType) ? type.compare(aValue, bValue) : -1;
    }
    // If b is this type but not a then b comes first
    if (type.is(bSource, bType)) return 1;
  }
};

// FIXME this is crazy lazy
var assert = require('assert');
typewise.equal = function(a, b) {
  // TODO stringify functions, ignore prototypes, etc.
  return assert.deepEqual(a, b);
};


// List of possible comparators our types may use

var comparators = typewise.comparators = {
  difference: function(a, b) {
    return a - b;
  },
  inequality: function(a, b) {
    return a < b ? -1 : ( a > b ? 1 : 0 );
  },
  bytewise: function(a, b) {
    var result;
    for (var i = 0, length = Math.min(a.length, b.length); i < length; i++) {
      result = a.get ? a.get(i) - b.get(i) : a[i] - b[i];
      if (result) return result;
    }
    return a.length - b.length;
  },
  elementwise: function(a, b) {
    var result;
    for (var i = 0, length = Math.min(a.length, b.length); i < length; ++i) {
      result = compare(a[i], b[i]);
      if (result) return result;
    }
    return a.length - b.length;
  }
};
// FIXME Y U NO WORK BUFFERTOOLS?!
// Attempt to use the fast native version in buffertools
// try {
//   require('buffertools').compare;
//   comparators.bytewise = function(a, b) {
//     return a.compare(b);
//   }
// }
// catch (e) {}


// Type System
// TODO eq, gt, lt, gte, lte
// Serialize and parse tear apart certain native forms and structure in a way that's serializable and revive them back into equivalent forms
// TODO revivers for collection types

var types = typewise.types = {

  undefined: {
    is: function(source) {
      return source === void 0;
    },
    compare: comparators.inequality
  },

  null: {
    is: function(source) {
      return source === null;
    },
    compare: comparators.inequality
  },

  boolean: {
    is: function(source, typeOf) {
      return (typeOf || typeof source) === 'boolean';
    },
    compare: comparators.inequality
  },

  number: {
    is: function(source, typeOf) {
      return (typeOf || typeof source) === 'number';
    },
    compare: comparators.difference
  },

  date: {
    is: function(source) {
      return source instanceof Date;
    },
    compare: comparators.difference
  },

  binary: {
    is: isBinary,
    compare: comparators.bytewise
  },

  string: {
    is: function(source, typeOf) {
      return (typeOf || typeof source) === 'string';
    },
    compare: comparators.inequality
  },

  set: {
    is: function(source) {
      return source instanceof Set;
    },
    compare: comparators.elementwise // TODO typewise sort on elements first?
  },

  array: {
    is: function(source) {
      return Array.isArray(source);
    },
    compare: comparators.elementwise
  },

  object: {
    is: function(source) {
      return typeof source === 'object' && Object.prototype.toString.call(source) === '[object Object]';
    },
    compare: comparators.elementwise
  },

  map: {
    is: function(source) {
      return source instanceof Map;
    },
    compare: comparators.elementwise
  },

  regexp: {
    is: function(source) {
      return source instanceof RegExp;
    },
    compare: comparators.elementwise,
    serialize: function(value) {
      value = value.toString();
      var string = value.toString();
      var lastSlash = string.lastIndexOf('/');
      return [ string.slice(1, lastSlash), string.slice(lastSlash + 1) ];
    },
    parse: function(syntax) {
      return RegExp.apply(null, syntax);
    }
  },

  function: {
    is: function(source, typeOf) {
      return (typeOf || typeof source) === 'function';
    },
    compare: comparators.elementwise
  }

};


if(process.title != 'browser')
  require('./ses')(types)
