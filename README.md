typewise
=========

Typewise structured sorting for arbirarily complex data structures. This package defines and imlements the collation used by bytewise (and eventually elementwise -- an array-based version of bytewise suitable for CouchDB and IndexedDB).

The actual ordering is subject to change, although ideally it will remain a superset of the type-based collations defined by CouchDB and IndexedDB.



## Type system

In order to properly express the rules for sorting and equality for a wide range of structures we define a type system. Another f'ing type system, you ask? Doesn't javascript already have too many of those? Probably, yes. But when you get down to it this is just what's necessary to fully and correctly specify this kind of algorithm. Specifying aa total order requires defining the full trichotomy of greater than, less than and equal for every combination of values we want to support, as well as unambiguously identifying all values we will not support.

But this isn't nearly as bad as it sounds. We're not trying to define anything fancy like type checking, just the structures of our types, how they should be sorted and what constitutes equality.


## TODO

We're leaning on some pretty heavyweight dependencies to support a *very* uncommon use case (parsing and reviving functions). This functionality could be pushed into another package and typewise could be completely agnostic to these parsing and reviving concerns for functions and even complex collections like Map and Set and friends.

## License

[MIT](http://deanlandolt.mit-license.org/)
