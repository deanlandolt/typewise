typewise
=========

Typewise structured sorting for arbirarily complex data structures. It defines and imlements the collation used by bytewise (and eventually, elementwise -- an array-based version of bytewise suitable for CouchDB and IndexedDB).


## Equality and Inequality

In order to properly define a total order we have to also define the full *trichotomy* of greater than, less than and equal for every combination of values we want to support, as well as unambiguously identifying all values we will not support and taking appropriate action.

Fundamentally this means defining *yet another* type system. But this is inescapable so we may as well embrace it. This doesn't mean we have to go all out, of course.


## License

[MIT](http://deanlandolt.mit-license.org/)