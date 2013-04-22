'use strict';
require('es6-shim');

var typewise = exports;

function getValue(source) {
  return source == null ? source : source.valueOf();
}

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

  var typeTags = [
    'undefined',
    'null',
    'boolean',
    'number',
    'date',
    'binary',
    'string',
    'set',
    'array',
    'map',
    'regexp',
    'function'
  ];

  // Cache typeof for both values
  var aType = typeof aSource;
  var bType = typeof bSource;
  // Loop over type tags and attempt compare
  for (var i = 0, length = typeTags.length; i < length; ++i) {
    var type = typewise.type[typeTags[i]];
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
  // TODO should this be variadic?
  // TODO stringify functions, ignore prototypes, etc.
  return assert.deepEqual(a, b);
};


// List of possible comparators our types may use

compare.difference = function(a, b) {
  return a - b;
};

compare.inequality = function(a, b) {
  return a < b ? -1 : ( a > b ? 1 : 0 );
};

compare.elementwise = function(a, b) {
  var result;
  for (var i = 0, length = Math.min(a.length, b.length); i < length; ++i) {
    result = compare(a[i], b[i]);
    if (result) return result;
  }
  return a.length - b.length;
};

compare.bytewise = function(a, b) {
  var result;
  for (var i = 0, length = Math.min(a.length, b.length); i < length; i++) {
    result = a.get(i) - b.get(i);
    if (result) return result;
  }
  return a.length - b.length;
}
// FIXME Y U NO WORK BUFFERTOOLS?!
// Attempt to use the fast native version in buffertools
// try {
//   require('buffertools');
//   compare.bytewise = function(a, b) {
//     return a.compare(b);
//   }
// }
// catch (e) {
//   compare.bytewise = bytewiseCompare;
// }


// Type System
// TODO equality?
typewise.type = {

  'undefined': {
    is: function(source) {
      return source === void 0;
    },
    compare: compare.inequality
  },

  'null': {
    is: function(source) {
      return source === null;
    },
    compare: compare.inequality
  },

  'boolean': {
    is: function(source, typeOf) {
      return (typeOf || typeof source) === 'boolean';
    },
    compare: compare.inequality
  },

  number: {
    is: function(source, typeOf) {
      return (typeOf || typeof source) === 'number';
    },
    compare: compare.difference
  },

  date: {
    is: function(source) {
      return source instanceof Date;
    },
    compare: compare.difference
  },

  binary: {
    is: function(source) {
      // TODO typed arrays, etc.
      return source instanceof Buffer;
    },
    compare: compare.bytewise
  },

  string: {
    is: function(source, typeOf) {
      return (typeOf || typeof source) === 'string';
    },
    compare: compare.inequality
  },

  set: {
    is: function(source) {
      return source instanceof Set;
    },
    compare: compare.elementwise // TODO typewise sort on elements first?
  },

  array: {
    is: function(source) {
      return Array.isArray(source);
    },
    compare: compare.elementwise
  },

  map: {
    is: function(source) {
      // TODO or plain object
      return source instanceof Map;
    },
    compare: compare.elementwise
  },

  regexp: {
    is: function(source) {
      return source instanceof RegExp;
    },
    compare: compare.elementwise,
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

  'function': {
    is: function(source, typeOf) {
      return (typeOf || typeof source) === 'function';
    },
    compare: compare.elementwise
  }

};

// Serialize and parse tear apart certain native forms and structure in a way that's serializable and revive them back into equivalent forms
// TODO collection types


// Attempt to load necessary dependencies to parse and properly revive functions in a safe SES sandbox
var runtime = {};
try {
  runtime.esprima = require('esprima');
  runtime.escodegen = require('escodegen');
  runtime.context = require('./context');
}
catch (e) {
  // TODO should we bother with fallbacks?
  runtime = null;
}

if (runtime) {
  typewise.type['function'].serialize = function(value) {
    var syntax = runtime.esprima.parse('(' + value + ')');
    // TODO validate AST is a FunctionExpression in a ExpressionStatement
    var params = syntax.body[0].expression.params.map(function(param) {
      // TODO is this guard necessary?
      if (param.type === 'Identifier') return params.name;
    }).filter(function(param) {
      return param;
    });
    // TODO play around with some escodegen options
    // We could minify to normalize functions as best as possible
    return params.concat(runtime.escodegen.generate(syntax.body[0].expression.body));
  };
  typewise.type['function'].parse = function(syntax) {
    return runtime.context.Function.apply(null, syntax);
  };
}
