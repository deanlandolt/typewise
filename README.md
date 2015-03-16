typewise
=========

Typewise structured sorting for arbirarily complex data structures. This package defines and imlements the collation used by bytewise (and eventually elementwise -- an array-based version of bytewise suitable for CouchDB and IndexedDB).

The actual ordering is subject to change, although ideally it will remain a superset of the type-based collations defined by CouchDB and IndexedDB.


## Type system

In order to properly express the rules for sorting and equality for a wide range of structures we define a type system. Another f'ing type system, you ask? Doesn't javascript already have too many of those? Probably, yes. But when you get down to it this is just what's necessary to fully and correctly specify this kind of algorithm. Specifying a total order requires defining the full trichotomy of greater than, less than and equal for every combination of values we want to support, as well as unambiguously identifying all values we will not support.

But this isn't nearly as bad as it sounds. We're not trying to define anything fancy like type checking, just the structures of our types, how they should be sorted and what constitutes equality.

That said, primitives could be exposed to punch range holes in tuples or records, creating pattern ranges that would define a novel kind of type checking approach that would be simple, efficient and quite powerful.


## Future

### Generic collections

The ordering chosen for some of the types is somewhat arbitrary. It is intentionally structured to support those sorts defined by CouchDB and IndexedDB but there might be more logical placements, specifically for `BUFFER`, `SET`, and `FUNCTION`, which aren't defined in either. It may be beneficial to fully characterize the distinctions between collections that affect collation.
  
One possible breakdown for collection types:

* unordered set (order unimportant and thus sorted using standard collation)
  * unordered multiset, duplicates allowed
* chain (ordered set) (order-preserving with distinct values)
  * ordered multiset, duplicates allowed (a list)
* unordered map (keys as unordered set, objects are string-keyed maps)
  * unordered multimap (keys as unordered multiset), duplicates allowed
* ordered map (keys as ordered set)
  * ordered multimap (keys as ordered multiset), duplicates allowed

Perhaps we should always allow duplicates, and have the prevention of duplicates be a enforced at runtime by a schema of some sort.

The primary distinction between collections are whether their items are unary (sets or arrays of elements) or binary (maps of keys and values). The secondary distinction is whether the collection preserves the order of its elements or not. For instance, arrays preserve the order of their elements while sets do not. Maps typically don't either, nor do javascript objects (even if they appear to at first). These are the two bits which characterize collection types that globally effect the sorting of the types.

There is a third characterizing bit: whether or not duplicates are allowed. The effect this has on sort is very localized, only for breaking ties between two otherwise identical keys -- otherwise records are completely interwoven when sorted, regardless of whether duplicates are allowed or not.

We may want unique symbols to signal these characterizing bits for serialization.

We probably want hooks for custom revivers.

Sparse arrays could be modeled with sorted maps of integer keys, but should we use a trailer to preserve this data?

This is very close to a generalized total order for all possible data structure models.

### Performance

Encoding and decoding is surely slower than the native `JSON` functions, but there is plenty of room to narrow the gap. Once the serialization stabilizes a C port should be straitforward to narrow the gap further.

### Streams

Where this serialization should really shine is streaming. Building a stream from individually encoded elements should require little more than strait concatenation, and parsing a stream would be the same as parsing an array. Parsing is a little more complex than msgpack and many other binary encodings because we have to use termination characters, not length specifiers, for certain types to keep from screwing up our collation invariants. This also means we have to do a little escapement dance, which costs a little extra too.

## License

[MIT](http://deanlandolt.mit-license.org/)
