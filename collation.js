//
// extend core typewise collations
//
var collation = module.exports = require('typewise-core/collation')

//
// replace base bitwise comparison with faster native versions where available
//
try {
  var bufferCtor = require('bops').create([]).constructor
  if (bufferCtor.compare) {
    collation.bitwise = bufferCtor.compare
  }
  else {
    try {
      //
      // attempt to use a faster native implementation from the buffertools lib
      //
      require('buffertools')
      var _bitwise = collation.bitwise
      var _bitwiseShortlex = shortlex.bitwise

      //
      // buffertools compare is shortlex
      //
      shortlex.bitwise = function (a, b) {
        try {
          return a.compare(b)
        }
        catch (e) {
          return _bitwiseShortlex(a, b)
        }
      }

      //
      // bypass buffertools compare if lengths differ (it uses shortlex order)
      //
      collation.bitwise = function (a, b) {
        // TODO: slice larger buffer and run through buffertools compare instead?
        if (a.length !== b.length)
          return _bitwise(a, b)

        try {
          return a.compare(b)
        }
        catch (e) {
          return _bitwise(a, b)
        }
      }
    }
    catch (e) {}
  }
}
catch (e) {}

// TODO: set, map

