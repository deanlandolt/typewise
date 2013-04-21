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
  console.log(aSource)
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
  var typeTag;
  // Loop over type tags and attempt compare
  for (var i = 0, length = typeTags.length; i < length; ++i) {
    typeTag = typeTags[i];
    if (type.is[typeTag](aSource, aType)) {
      // If b is the same as a then defer to the type's comparator, otherwise a comes first
      return type.is[typeTag](bSource, bType) ? type.compare[typeTag](aValue, bValue) : -1;
    }
    // If b is this type but not a then b comes first
    if (type.is[typeTag](bSource, bType)) return 1;
  }
};

// FIXME this is crazy lazy
var assert = require('assert');
typewise.equal = function(a, b) {
  // TODO should this be variadic?
  // TODO stringify functions, ignore prototypes, etc.
  return assert.deepEqual(a, b);
};


function type() {}
typewise.type = type;

// Instance checks

type.is = {};
type.is['undefined'] = function(source) {
  return source === void 0;
};
type.is['null'] = function(source) {
  return source === null;
};
type.is.boolean = function(source, typeOf) {
  return (typeOf || typeof source) === 'boolean';
};
type.is.number = function(source, typeOf) {
  return (typeOf || typeof source) === 'number';
};
type.is.date = function(source) {
  return source instanceof Date;
};
type.is.binary = function(source) {
  // TODO typed arrays, etc.
  return source instanceof Buffer;
};
type.is.string = function(source, typeOf) {
  return (typeOf || typeof source) === 'string';
};
type.is.set = function(source) {
  return source instanceof Set;
};
type.is.array = function(source) {
  return Array.isArray(source);
};
type.is.map = function(source) {
  // TODO or plain object
  return source instanceof Map;
};
type.is.regexp = function(source) {
  return source instanceof RegExp;
};
type.is.function = function(source, typeOf) {
  return (typeOf || typeof source) === 'function';
};


// The list of possible comparators we can choose from

compare.none = function() {
  return 0;
};

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

type.compare = {};
type.compare['undefined'] = compare.none;
type.compare['null'] = compare.none;
type.compare.boolean = compare.inequality;
type.compare.number = compare.difference;
type.compare.date = compare.difference;
type.compare.string = compare.inequality;
type.compare.binary = compare.bytewise;
type.compare.set = compare.elementwise; // TODO typewise sort elements first?
type.compare.array = compare.elementwise;
type.compare.map = compare.elementwise;
type.compare.regexp = compare.elementwise;
type.compare.function = compare.elementwise;


// Tear apart certain native forms and structure in a way that's serializable and revive them back into equivalent forms
type.toValue = function(typeTag, value) {
  var toValue = type.toValue[typeTag];
  if (toValue) return toValue(value);
  return value;
};
type.fromValue = function(typeTag, syntax) {
  var fromValue = type.fromValue[typeTag];
  if (fromValue) return fromValue(syntax);
  return syntax;
};

type.toValue.regexp = function(value) {
  value = value.toString();
  var string = value.toString();
  var lastSlash = string.lastIndexOf('/');
  return [ string.slice(1, lastSlash), string.slice(lastSlash + 1) ];
};
type.fromValue.regexp = function(syntax) {
  return RegExp.apply(null, syntax);
};

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
  type.toValue.function = function(value) {
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
  type.fromValue.function = function(syntax) {
    return runtime.context.Function.apply(null, syntax);
  };
}

