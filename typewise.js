'use strict';

var bops = require('bops');

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
  'array',
  'object',
  'regexp',
  'function'
];

var compare = typewise.compare = function(aSource, bSource) {
  // Short circuit identical objects
  if (aSource === bSource) return 0;

  // Error objects are incomparable
  if (aSource instanceof Error || bSource instanceof Error) return NaN;

  // Unbox possible values to primitives before any NaN checks
  var aValue = getValue(aSource);
  var bValue = getValue(bSource);

  // NaN and Invalid Date are incomparable
  if (aValue !== aValue || bValue !== bValue) return NaN;

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
  // TODO serialize functions, regex, etc.
};

typewise.equal = function(a, b) {
  // TODO optimize specific comparisons
  return compare(a, b) === 0;
};


// Possible comparators our types may use
var comparators = typewise.comparators = {
  difference: function(a, b) {
    return a - b;
  },
  inequality: function(a, b) {
    return a < b ? -1 : ( a > b ? 1 : 0 );
  },
  bytewise: function (a, b) {
    var result;
    for (var i = 0, length = Math.min(a.length, b.length); i < length; ++i) {
      result = a[i] - b[i];
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
  },
  keywise: function (a, b) {
    var aKeys = [];
    var bKeys = [];
    var key;
    var result;
    for (key in a) aKeys.push(key);
    for (key in b) bKeys.push(key);
    for (var i = 0, length = Math.min(aKeys.length, bKeys.length); i < length; ++i) {
      result = compare(a[i], b[i]);
      if (result) return result;
    }
    return aKeys.length - bKeys.length;
  }
};


// Type System
// TODO eq, gt, lt, gte, lte
// Serialize and parse tear apart certain native forms and structure in a way
// that's serializable and revive them back into equivalent forms
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
    compare: comparators.inequality,
    empty: false,
    unit: true
  },

  number: {
    is: function(source, typeOf) {
      return (typeOf || typeof source) === 'number';
    },
    compare: comparators.difference,
    empty: 0,
    unit: 1,
    add: function () {
      var result = 0;
      for (var i = 0, length = arguments.length; i < length; ++i) {
        result + arguments[i];
      }
      return result;
    }
  },

  date: {
    is: function(source) {
      return source instanceof Date;
    },
    compare: comparators.difference
  },

  binary: {
    is: bops.is,
    compare: comparators.bytewise,
    empty: bops.create('') // TODO ICANHAZ immutable buffer?
  },

  string: {
    is: function(source, typeOf) {
      return (typeOf || typeof source) === 'string';
    },
    compare: comparators.inequality,
    empty: ''
  },

  array: {
    is: function(source) {
      return Array.isArray(source);
    },
    compare: comparators.elementwise,
    empty: Object.freeze([]),
    add: function () {
      var result = [];
      for (var i = 0, length = arguments.length; i < length; ++i) {
        if (!Array.isArray(arguments[i])) {
          throw new TypeError('Array arguments required');
        }
        result = result.concat(arguments[i]);
      }
      return result;
    }
  },

  object: {
    is: function(source) {
      return typeof source === 'object' && Object.prototype.toString.call(source) === '[object Object]';
    },
    compare: comparators.keywise,
    empty: Object.freeze({})
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
    },
    empty: Object.freeze(new RegExp())
  },

  function: {
    is: function(source, typeOf) {
      return (typeOf || typeof source) === 'function';
    },
    compare: comparators.elementwise,
    empty: function (i) { return i }
  }

};


// Use native `Buffer.compare` if available
if (types.binary.empty.constructor.compare) {
  comparators.bytewise = types.binary.empty.constructor.compare;
}
else {
  // Attempt to use the fast native version from buffertools
  try {
    require('buffertools')
    var _bytewiseCompare = comparators.bytewise;
    comparators.bytewise = function (a, b) {
      // Bypass buffertools compare if lengths differ
      // TODO slice larger buffer to pass to buffertools compare
      if (a.length !== b.length) return _bytewiseCompare(a, b);
      return a.compare(b);
    };
  }
  catch (e) {}
}
