// Attempt to load necessary dependencies to parse and properly revive functions in a safe SES sandbox

module.exports = function (types) {
  try {
    var esprima = require('esprima');
    var escodegen = require('escodegen');
    var context = require('./context')(escodegen);

    types.function.serialize = function(value) {
      var syntax = esprima.parse('(' + value + ')');
      // TODO validate AST is a FunctionExpression in an ExpressionStatement
      var params = syntax.body[0].expression.params.map(function(param) {
        // TODO is this guard necessary?
        if (param.type === 'Identifier') return param.name;
      }).filter(function(param) {
        return param;
      });
      // TODO play around with some escodegen options
      // We could minify to normalize functions as best as possible
      var c 
      console.log(c = params.concat(escodegen.generate(syntax.body[0].expression.body)))
      return c; //params.concat(escodegen.generate(syntax.body[0].expression.body));
    };
    types.function.parse = function(syntax) {
      return context.Function.apply(null, syntax);
    };
  }
  catch (e) {
 
   // TODO should we bother with fallbacks?
  }
}
