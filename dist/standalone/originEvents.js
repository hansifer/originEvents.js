// originEvents.js 0.1.0
// https://github.com/hansifer/originEvents.js
// (c) 2013-2014 Hans Meyer; Licensed MIT

(function(undefined) {var _=_||underscoreInit.call(this),uuid=uuid||uuidInit.call(this);


(function(undefined) {
	var global = this;

	var incrementor = 0;
	var baseKeyName = 'originEvents.nooxis.com.';
	var windowKeyName = baseKeyName + uuid.v4() + '.';
	var re = new RegExp('^' + baseKeyName.replace('.', '\\.') + '[0-9a-f]{32}\\.\\d+$');

	var listeners = {};

	var VERSION = '0.1.0';

	// number of total handlers with 'remote' or 'all' scope; used to add/remove 'storage' listener as needed
	var remoteListenerCount = 0;

	var snorkel;

	// called when 'storage' event is raised
	var storageEventHandler = function(e) {
		var originEvent;

		// Checking for "e.newValue" instead of "e.newValue !== null" because IE uses empty string instead of null for e.oldValue and e.newValue when adding and removing storage items, respectively.
		// Third condition is required for IE only since it raises locally-sourced "storage" events (against spec) in addition to remote ones
		if (e.newValue && re.test(e.key) && e.key.substring(0, windowKeyName.length) !== windowKeyName) {
			originEvent = snorkel.decodeValue(e.newValue);
			emitLocally(originEvent.type, originEvent.message, originEvent.datetime, true, e.key);
		}
	};

	var emitLocally = function(iType, iMessage, iDatetime, iIsRemoteEvent, iId) {
		_.each(listeners[iType], function(handler) {
			if (handler.s === 'all' || ((handler.s === 'remote' && iIsRemoteEvent) || (handler.s === 'local' && !iIsRemoteEvent))) {
				handler.h(iType, iMessage, iDatetime, iIsRemoteEvent, iId);
			}
		});
	};

	// API 

	// iScope determines the types of events this handler processes ('local', 'remote', or 'all' [default])
	var on = function(iType, iHandler, iScope) {
		iScope = iScope === 'local' && 'local' || iScope === 'remote' && 'remote' || 'all';

		if (!(iType in listeners)) {
			listeners[iType] = [];
		}

		// allowing duplicate handlers per event type
		listeners[iType].push({
			h: iHandler,
			s: iScope
		});

		if (iScope === 'remote' || iScope === 'all') {
			if (!remoteListenerCount) {
				global.addEventListener('storage', storageEventHandler, false);
			}

			remoteListenerCount++;
		}
	};

	var off = function(iType, iHandler) {
		var index, handler;

		if (iType in listeners) {
			if (iHandler) {
				handler = _.find(listeners[iType], function(el, i) {
					if (el.h === iHandler) {
						index = i;
						return true;
					}
					return false;
				});

				if (!_.isUndefined(index)) {
					if (remoteListenerCount && (handler.s === 'remote' || handler.s === 'all')) {
						remoteListenerCount = Math.max(remoteListenerCount - 1, 0);

						if (!remoteListenerCount) {
							global.removeEventListener('storage', storageEventHandler, false);
						}
					}

					listeners[iType].splice(index, 1);
				}
			} else {
				if (remoteListenerCount) {
					_.each(listeners[iType], function(el) {
						if (el.s === 'remote' || el.s === 'all') {
							remoteListenerCount = Math.max(remoteListenerCount - 1, 0);
						}
					});

					if (!remoteListenerCount) {
						global.removeEventListener('storage', storageEventHandler, false);
					}
				}

				delete listeners[iType];
			}
		}
	};

	// requires context
	// returns event id
	var trigger = function(iType, iMessage) {
		var key = windowKeyName + (incrementor++);
		var datetime = new Date();

		if (this.canEmitRemotely()) {
			snorkel.set(key, {
				// incrementor: ++incrementor,
				datetime: datetime,
				type: iType,
				message: iMessage
			});

			localStorage.removeItem(key); // don't incur unnecessary overhead for snorkel features we don't need
		}

		if (this.canEmitLocally()) {
			emitLocally(iType, iMessage, datetime, false, key);
		}

		return key;
	};

	// requires context
	var canEmitLocally = function(iCanEmitLocally) {
		if (arguments.length) {
			this._l = iCanEmitLocally;
		}

		return this._l;
	};

	// requires context
	var canEmitRemotely = function(iCanEmitRemotely) {
		if (arguments.length) {
			this._r = iCanEmitRemotely;
		}

		return this._r;
	};

	// initializes and returns a originEvents context
	var originEventsInit = function(iCanEmitLocally, iCanEmitRemotely) {
		var ret = {};

		ret.on = on;
		ret.off = off;
		ret.trigger = trigger;
		ret.canEmitLocally = canEmitLocally;
		ret.canEmitRemotely = canEmitRemotely;
		ret.version = VERSION;

		ret.canEmitLocally(_.isUndefined(iCanEmitLocally) || iCanEmitLocally);
		ret.canEmitRemotely(_.isUndefined(iCanEmitRemotely) || iCanEmitRemotely);

		if (!snorkel) {
			snorkel = true;
			snorkel = global.snorkelInit(false, false); // not using snorkel events
		}

		return ret;
	};

	global.originEventsInit = originEventsInit;
}).call(this);


//!     Underscore.js 1.5.1
//!     http://underscorejs.org
//!     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//!     Underscore may be freely distributed under the MIT license.
//!

function underscoreInit() {

  // Baseline setup
  // --------------

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype,
    ObjProto = Object.prototype,
    FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
  push = ArrayProto.push,
    slice = ArrayProto.slice,
    concat = ArrayProto.concat,
    toString = ObjProto.toString,
    hasOwnProperty = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
  nativeForEach = ArrayProto.forEach,
    nativeMap = ArrayProto.map,
    nativeFilter = ArrayProto.filter,
    nativeEvery = ArrayProto.every,
    nativeSome = ArrayProto.some,
    nativeIndexOf = ArrayProto.indexOf,
    nativeLastIndexOf = ArrayProto.lastIndexOf,
    nativeIsArray = Array.isArray,
    nativeKeys = Object.keys,
    nativeBind = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  // if (typeof exports !== 'undefined') {
  //   if (typeof module !== 'undefined' && module.exports) {
  //     exports = module.exports = _;
  //   }
  //   exports._ = _;
  // } else {
  //   root._ = _;
  // }

  // Current version.
  _.VERSION = '1.5.1';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj) {
      return obj[value];
    };
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0,
      high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0,
      length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function() {};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
        // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
          a.global == b.global &&
          a.multiline == b.multiline &&
          a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor,
      bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
      _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0,
      result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof(/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape: new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  return _;
}


//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

function uuidInit() {
  var _global = this;

  // Unique ID creation requires a high quality random # generator.  We feature
  // detect to determine the best RNG source, normalizing to a function that
  // returns 128-bits of randomness, since that's what's usually required
  var _rng;

  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
  //
  // Moderately fast, high quality
  if (typeof(_global.require) == 'function') {
    try {
      var _rb = _global.require('crypto').randomBytes;
      _rng = _rb && function() {return _rb(16);};
    } catch(e) {}
  }

  if (!_rng && _global.crypto && crypto.getRandomValues) {
    // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
    //
    // Moderately fast, high quality
    var _rnds8 = new Uint8Array(16);
    _rng = function whatwgRNG() {
      crypto.getRandomValues(_rnds8);
      return _rnds8;
    };
  }

  if (!_rng) {
    // Math.random()-based (RNG)
    //
    // If all else fails, use Math.random().  It's fast, but is of unspecified
    // quality.
    var  _rnds = new Array(16);
    _rng = function() {
      for (var i = 0, r; i < 16; i++) {
        if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
        _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
      }

      return _rnds;
    };
  }

  // Buffer class to use
  var BufferClass = typeof(_global.Buffer) == 'function' ? _global.Buffer : Array;

  // Maps for number <-> hex string conversion
  var _byteToHex = [];
  var _hexToByte = {};
  for (var i = 0; i < 256; i++) {
    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
    _hexToByte[_byteToHex[i]] = i;
  }

  // // **`parse()` - Parse a UUID into it's component bytes**
  // HMM 2013-11-07 comment unused 'parse' function
  // function parse(s, buf, offset) {
  //   var i = (buf && offset) || 0, ii = 0;

  //   buf = buf || [];
  //   s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
  //     if (ii < 16) { // Don't overflow!
  //       buf[i + ii++] = _hexToByte[oct];
  //     }
  //   });

  //   // Zero out remaining bytes if string was short
  //   while (ii < 16) {
  //     buf[i + ii++] = 0;
  //   }

  //   return buf;
  // }

  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
  // HMM 2013-11-07 eliminate dashes from output
  function unparse(buf, offset) {
    var i = offset || 0, bth = _byteToHex;
    return  bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + 
            bth[buf[i++]] + bth[buf[i++]] + 
            bth[buf[i++]] + bth[buf[i++]] + 
            bth[buf[i++]] + bth[buf[i++]] + 
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
  }

  // HMM 2013-11-07 comment unused 'v1' function

  // // **`v1()` - Generate time-based UUID**
  // //
  // // Inspired by https://github.com/LiosK/UUID.js
  // // and http://docs.python.org/library/uuid.html

  // // random #'s we need to init node and clockseq
  // var _seedBytes = _rng();

  // // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
  // var _nodeId = [
  //   _seedBytes[0] | 0x01,
  //   _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
  // ];

  // // Per 4.2.2, randomize (14 bit) clockseq
  // var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

  // // Previous uuid creation time
  // var _lastMSecs = 0, _lastNSecs = 0;

  // // See https://github.com/broofa/node-uuid for API details
  // function v1(options, buf, offset) {
  //   var i = buf && offset || 0;
  //   var b = buf || [];

  //   options = options || {};

  //   var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

  //   // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  //   // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  //   // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  //   // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  //   var msecs = options.msecs != null ? options.msecs : new Date().getTime();

  //   // Per 4.2.1.2, use count of uuid's generated during the current clock
  //   // cycle to simulate higher resolution clock
  //   var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

  //   // Time since last uuid creation (in msecs)
  //   var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  //   // Per 4.2.1.2, Bump clockseq on clock regression
  //   if (dt < 0 && options.clockseq == null) {
  //     clockseq = clockseq + 1 & 0x3fff;
  //   }

  //   // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  //   // time interval
  //   if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
  //     nsecs = 0;
  //   }

  //   // Per 4.2.1.2 Throw error if too many uuids are requested
  //   if (nsecs >= 10000) {
  //     throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  //   }

  //   _lastMSecs = msecs;
  //   _lastNSecs = nsecs;
  //   _clockseq = clockseq;

  //   // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  //   msecs += 12219292800000;

  //   // `time_low`
  //   var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  //   b[i++] = tl >>> 24 & 0xff;
  //   b[i++] = tl >>> 16 & 0xff;
  //   b[i++] = tl >>> 8 & 0xff;
  //   b[i++] = tl & 0xff;

  //   // `time_mid`
  //   var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  //   b[i++] = tmh >>> 8 & 0xff;
  //   b[i++] = tmh & 0xff;

  //   // `time_high_and_version`
  //   b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  //   b[i++] = tmh >>> 16 & 0xff;

  //   // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  //   b[i++] = clockseq >>> 8 | 0x80;

  //   // `clock_seq_low`
  //   b[i++] = clockseq & 0xff;

  //   // `node`
  //   var node = options.node || _nodeId;
  //   for (var n = 0; n < 6; n++) {
  //     b[i + n] = node[n];
  //   }

  //   return buf ? buf : unparse(b);
  // }

  // **`v4()` - Generate random UUID**

  // See https://github.com/broofa/node-uuid for API details
  function v4(options, buf, offset) {
    // Deprecated - 'format' argument, as supported in v1.2
    var i = buf && offset || 0;

    if (typeof(options) == 'string') {
      buf = options == 'binary' ? new BufferClass(16) : null;
      options = null;
    }
    options = options || {};

    var rnds = options.random || (options.rng || _rng)();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
      for (var ii = 0; ii < 16; ii++) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || unparse(rnds);
  }

  // Export public API
  var uuid = v4;
  // HMM 2013-11-07 comment unused code
  // uuid.v1 = v1;
  uuid.v4 = v4;
  // HMM 2013-11-07 comment unused code
  // uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;

  if (typeof define === 'function' && define.amd) {
    // Publish as AMD module
    define(function() {return uuid;});
  } else if (typeof(module) != 'undefined' && module.exports) {
    // Publish as node.js module
    module.exports = uuid;
  } else {
    // Publish as global (in browsers)
    // var _previousRoot = _global.uuid;

    // **`noConflict()` - (browser only) to reset global 'uuid' var**
    // uuid.noConflict = function() {
    //   _global.uuid = _previousRoot;
    //   return uuid;
    // };

    // _global.uuid = uuid;
    return uuid;
  }
}


// snorkel.js 0.1.0
// https://github.com/hansifer/snorkel.js
// (c) 2013-2014 Hans Meyer; Licensed MIT
//
// Depends:
// underscore (https://github.com/jashkenas/underscore)
// originEvents (https://github.com/hansifer/originEvents.js)

(function(undefined) {
	// set global to 'window' (browser) or 'exports' (server)
	var global = this;

	var localStorage = global.localStorage;

	// record access names and current references
	var access = {};
	access.snorkelInit = global.snorkelInit;
	// access.snorkel = global.snorkel;
	// access.J = global.J;

	var listeners = [];

	var VERSION = '0.1.0';

	var remoteEventListenerCount = 0;

	var i, originEvents;

	// --- VALIDATION ---

	// do not allow key to be null, undefined, NaN, Infinity, true, false, ''

	var isValidKey = function(iKey) {
		return (_.isString(iKey) && iKey.length) || _.isFinite(iKey);
	};

	var isValidValue = function(iValue) {
		return _.isString(iValue) || _.isFinite(iValue) || _.isBoolean(iValue) || (_.isObject(iValue) && !_.isFunction(iValue)) || _.isNull(iValue) || _.isUndefined(iValue);
	};

	var checkKey = function(iKey) {
		if (!isValidKey(iKey)) {
			throw 'snorkel invalid key ' + toValueString(iKey, '');
		}

		return true;
	};

	var checkValue = function(iValue) {
		if (!isValidValue(iValue)) {
			throw 'snorkel invalid value ' + toValueString(iValue, '');
		}

		return true;
	};

	// --- VALUE CONVERSION ---

	// var encodeValue = function(iValue) {
	// 	var nativeDateToJSONMethod;

	// 	if (_.isDate(iValue) || _.isObject(iValue)) {
	// 		nativeDateToJSONMethod = Date.prototype.toJSON;
	// 		Date.prototype.toJSON = altDateToJSONMethod;
	// 	}

	// 	iValue = JSON.stringify(iValue);

	// 	if (nativeDateToJSONMethod) {
	// 		Date.prototype.toJSON = nativeDateToJSONMethod;
	// 	}

	// 	return iValue;
	// };

	// var altDateToJSONMethod = function() {
	// 	return '\\/Date(' + this.toISOString() + ')\\/';
	// };

	var encodeValue = function(iValue) {
		return JSON.stringify(preEncodeValue(iValue));
	};

	var preEncodeValue = function(iValue, iVisited) {
		var i, clone, visited;

		if (_.isDate(iValue)) {
			return '\\/Date(' + iValue.toISOString() + ')\\/';
		} else if (_.isRegExp(iValue)) {
			return '\\/RegExp(' + iValue.source + ')' + (iValue.global || iValue.ignoreCase || iValue.multiline ? '(' + (iValue.global ? 'g' : '') + (iValue.ignoreCase ? 'i' : '') + (iValue.multiline ? 'm' : '') + ')' : '') + '\\/';
		} else if (_.isUndefined(iValue)) {
			return '\\/undefined\\/';
		} else if (_.isObject(iValue)) {
			if (!iVisited) {
				iVisited = [];
			} else if (visited = _.find(iVisited, function(el) {
				return el.orig === iValue;
			})) {
				return visited.clone;
			}

			if (_.isArray(iValue)) {
				clone = [];
			} else {
				clone = {};
			}

			// visited = arrayAppend(iVisited, {
			// 	orig: iValue,
			// 	clone: clone
			// });

			iVisited.push({
				orig: iValue,
				clone: clone
			});

			for (i in iValue) {
				clone[i] = preEncodeValue(iValue[i], /*visited*/ iVisited);
			}

			return clone;
		}

		return iValue;
	};

	var decodeValue = function(iValue) {
		// process snorkel value equivalents - these values are not set by snorkel but may be present via direct localStorage.setItem() calls
		if (iValue === '') {
			return null;
		} else if (iValue === 'undefined') {
			return;
		}

		// try {
		// 	iValue = JSON.parse(iValue);
		// } catch (ex) {}

		// return postDecodeValue(iValue);

		return postDecodeValue(JSON.parse(iValue));
	};

	// not cloning here (as in preEncodeValue()) because iValue target is not otherwise referenced.
	var postDecodeValue = function(iValue, iVisited) {
		var i;

		if (_.isString(iValue)) {
			return decodeDate(iValue) || decodeRegExp(iValue) || (iValue === '\\/undefined\\/' ? undefined : iValue);
		} else if (_.isObject(iValue)) {
			if (!iVisited) {
				iVisited = [];
			} else if (_.contains(iVisited, iValue)) {
				return iValue;
			}

			iVisited.push(iValue);

			for (i in iValue) {
				iValue[i] = postDecodeValue(iValue[i], iVisited);
			}
		}

		return iValue;
	};

	var decodeDate = function(iString) {
		if (_.isString(iString) && iString.substring(0, 7) === '\\/Date(') {
			return new Date(iString.substring(7, iString.indexOf(')')));
		}
	};

	var decodeRegExp = function(iString) {
		var idx, re;

		if (_.isString(iString) && iString.substring(0, 9) === '\\/RegExp(') {
			idx = iString.indexOf(')', 9);
			re = iString.substring(9, idx);

			idx = iString.indexOf('(', idx);
			if (idx !== -1) {
				return new RegExp(re, iString.substring(idx + 1, iString.indexOf(')', idx)));
			}

			return new RegExp(re);
		}
	};

	// --- GET/SET ---

	var getDecodedStoredValue = function(iKey) {
		if (exists(iKey)) {
			return decodeValue(localStorage.getItem(iKey));
		}
	};

	// requires context
	var setStoredValue = function(iKey, iValue, iEncodedValue) {
		var oldValue;

		if (_.isUndefined(iEncodedValue)) {
			iEncodedValue = encodeValue(iValue);
		}

		if (this.canEmitLocally() && listeners.length || this.canEmitRemotely()) {
			if (exists(iKey)) {
				oldValue = get(iKey);
				localStorage.setItem(iKey, iEncodedValue);
				emit.call(this, 'updated', iKey, iValue, oldValue);
			} else {
				localStorage.setItem(iKey, iEncodedValue);
				emit.call(this, 'added', iKey, iValue);
			}
		} else {
			localStorage.setItem(iKey, iEncodedValue);
		}
	};

	// --- EVENTS ---

	// requires context
	var emit = function(iEventType, iKey, iValue, iOldValue) {
		if (isValidKey(iKey)) {
			if (this.canEmitRemotely()) {
				originEvents.trigger('snorkel', {
					type: iEventType,
					key: iKey,
					value: iValue,
					oldValue: iOldValue
				});
			}

			if (this.canEmitLocally()) {
				emitLocally(iEventType, iKey, iValue, iOldValue);
			}
		}
	};

	var emitLocally = function(iEventType, iKey, iValue, iOldValue, isRemoteEvent) {
		var i, j;

		iKey = iKey.toString();

		//console.log('emission check:', iKey, iValue);
		for (i = 0; i < listeners.length; i++) {
			// console.log(listeners[i].h.name);
			for (j = 0; j < listeners[i].k.length; j++) {
				if (listeners[i].k[j].test(iKey) && (iEventType !== 'updated' || listeners[i].a === true || !_.isEqual(iValue, iOldValue)) && (listeners[i].s === 'all' || ((listeners[i].s === 'remote' && isRemoteEvent) || (listeners[i].s === 'local' && !isRemoteEvent)))) {
					// console.log('match test SUCCESS:', listeners[i].k[j].source, iKey);
					break; // only one call per handler even if multiple keySelectors qualify
					// } else {
					// console.log('match test FAIL:', listeners[i].k[j].source, iKey);
				}
			}

			if (j === 0 || j < listeners[i].k.length) {
				listeners[i].h(iEventType, iKey, iValue, iOldValue, isRemoteEvent);
			}
		}
	};

	var normalizeKeySelector = function(iKeySelector) {
		if (isValidKey(iKeySelector)) {
			return new RegExp('^' + escapeRegExp(iKeySelector) + '$');
		} else if (!_.isRegExp(iKeySelector)) {
			throw 'snorkel invalid key selector ' + toValueString(iKeySelector, '');
		}

		return iKeySelector;
	};

	var snorkelEventHandler = function(iType, iMessage /*, iDatetime, isRemoteEvent */ ) {
		emitLocally(iMessage.type, iMessage.key, iMessage.value, iMessage.oldValue, true);
	};

	// --- UTIL ---

	// source: http://stackoverflow.com/a/6969486/384062
	var escapeRegExp = function(iStr) {
		return iStr.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	};

	var toValueString = function(iObj, iFallback) {
		try {
			if (_.isObject(iObj)) {
				if (_.isFunction(iObj)) {
					return '[function]';
				}

				if (_.isRegExp(iObj)) {
					return '[RegExp] ' + iObj.source;
				}

				return JSON.stringify(iObj); // TODO: not great because it converts the following property values to null: undefined, NaN, Infinity, -Infinity; call toValueString() recursively instead for arrays and objects (will need to detect cycles)
			} else {
				return iObj + '';
			}
		} catch (ex) {}

		return iFallback;
	};

	// var arrayAppend = function(arr, val) {
	// 	var ret = arr.slice();

	// 	ret.push(val);

	// 	return ret;
	// };

	// --- API ---

	// HMM 2013-11-23: NOTE: do not add formal parameters to this function
	// requires context
	var multi = function() {
		var iKey, l = arguments.length;

		if (l > 2) {
			throw 'snorkel call failed. 0-2 arguments expected, ' + l + ' present.';
		}

		// "snorkel()" get call; return store in its entirety as a JS object

		if (!l) {
			return get();
		}

		iKey = arguments[0];

		// "snorkel('id','foo')" set call

		if (l === 2) {
			return this.set(iKey, arguments[1]);
		}

		// "snorkel({id:123,name:'foo'})" set call; note that this only considers enumerable properties

		if (_.isObject(iKey) && !_.isArray(iKey) && !_.isRegExp(iKey)) {
			return this.set(iKey);
		}

		// "snorkel('id')" get call

		return get(iKey);
	};

	// snorkel.noConflict = function() {
	// 	var i;

	// 	if (arguments.length) {
	// 		_.each(arguments, function(arg) {
	// 			if (arg in access) {
	// 				global[arg] = access[arg]; // reset original reference
	// 			}
	// 		});
	// 	} else {
	// 		for (i in access) {
	// 			global[i] = access[i];
	// 		}
	// 	}

	// 	return snorkel;
	// };

	// iKey may be a non-empty string, number, or arbitrarily-nested array of such
	// if single-key (ie, primitive) arg, returns corresponding decoded stored value; non-existent key yields undefined or iDefault if provided
	// if multi-key (ie, array) arg, returns flat array of all corresponding decoded stored values; non-existent-key values are filled with undefined or iDefault if provided
	// if no args, returns object representation of entire data store
	// iDefault may be any value. If it's a function, the default value of the key is determined by the value of a call to the function, passing it the key.
	var get = function(iKey, iDefault) {
		var ret, i;

		if (arguments.length > 2) {
			throw 'snorkel get failed. 0-2 arguments required, ' + arguments.length + ' present.';
		}

		if (!arguments.length) {
			ret = {};

			for (i = 0; i < localStorage.length; i++) {
				iKey = localStorage.key(i);
				ret[iKey] = get(iKey);
			}

			return ret;
		}

		if (_.isRegExp(iKey)) {
			return get(keys(true, iKey)); // iDefault is moot, so don't pass it
		}

		if (_.isArray(iKey)) {
			return _.flatten(_.map(iKey, function(iKey) {
				return get(iKey, iDefault);
			}));
		}

		checkKey(iKey);

		if (_.isUndefined(iDefault) || exists(iKey)) {
			return getDecodedStoredValue(iKey);
		}

		if (_.isFunction(iDefault)) {
			return iDefault(iKey); // TODO: iKey.toString() here?
		} else {
			return iDefault;
		}
	};

	// iKey can be a non-empty string, number, arbitrarily-nested array of such (in which case iValue is set for each key in the array), or set object (in which case iValue must not be passed)
	// if single-key (ie, primitive) or multi-key (ie, array) arg, returns iValue.
	// if set object, returns array of set values.
	// requires context
	var set = function(iKey, iValue) {
		var encodedValue, ret;

		if (arguments.length === 1) {
			if (!_.isObject(iKey) || _.isArray(iKey) || _.isRegExp(iKey)) {
				throw 'snorkel set failed. Calling set() with a single argument requires a set object, but actual argument is ' + toValueString(iKey, '');
			}

			// check all properties first so set is atomic

			_.each(iKey, function(iValue, iKey) {
				checkKey(iKey);
				checkValue(iValue);
			});

			ret = [];
			_.each(iKey, function(iValue, iKey) {
				setStoredValue.call(this, iKey, iValue);
				ret.push(iValue);
			}, this);

			return ret;
		}

		if (arguments.length !== 2) {
			throw 'snorkel set failed. A single set object or 2 arguments required, ' + arguments.length + ' present.';
		}

		checkValue(iValue);

		if (_.isRegExp(iKey)) {
			return set.call(this, keys(true, iKey), iValue);
		}

		if (_.isArray(iKey)) {
			iKey = _.flatten(iKey);

			// check each key first to make set atomic

			_.each(iKey, function(el, i) {
				if (_.isRegExp(el)) {
					iKey[i] = keys(true, el);
				} else {
					checkKey(el);
				}
			});

			iKey = _.uniq(_.flatten(iKey));

			encodedValue = encodeValue(iValue);
			_.each(iKey, function(iKey) {
				setStoredValue.call(this, iKey, iValue, encodedValue);
			}, this);
		} else if (checkKey(iKey)) {
			setStoredValue.call(this, iKey, iValue);
		}

		return iValue;
	};

	// iKey may be a non-empty string, number, or arbitrarily-nested array of such
	// if single-key (ie, primitive) arg, return decoded stored value of removed item; non-existent key yields undefined or iDefault if provided
	// if multi-key (ie, array) arg,  return flat array of decoded stored values of all removed items; non-existent-key values are filled with undefined or iDefault if provided
	// if no args, remove all items and return object representation of entire (removed) data store
	// requires context
	var remove = function(iKey, iDefault) {
		var storageData;

		if (arguments.length > 2) {
			throw 'snorkel remove failed. 0-2 arguments required, ' + arguments.length + ' present.';
		}

		if (arguments.length) {
			if (_.isRegExp(iKey)) {
				return remove.call(this, keys(true, iKey)); // iDefault is moot, so don't pass it
			}

			if (_.isArray(iKey)) {
				iKey = _.flatten(iKey);

				// check each key first to make remove atomic

				_.each(iKey, function(el, i) {
					if (_.isRegExp(el)) {
						iKey[i] = keys(true, el);
					} else {
						checkKey(el);
					}
				});

				iKey = _.uniq(_.flatten(iKey));

				return _.map(iKey, function(iKey) {
					return this.remove(iKey, iDefault);
				}, this);
			}

			checkKey(iKey);

			storageData = get(iKey, iDefault);
			if (exists(iKey)) {
				localStorage.removeItem(iKey);
				if (this.canEmitLocally() && listeners.length || this.canEmitRemotely()) {
					emit.call(this, 'removed', iKey, storageData);
				}
			}
			return storageData;
		}

		// remove all stored items
		storageData = all();
		if (localStorage.length) {
			localStorage.clear();
			if (this.canEmitLocally() && listeners.length || this.canEmitRemotely()) {
				_.each(storageData, function(iValue, iKey) {
					emit.call(this, 'removed', iKey, iValue);
				}, this);
			}
		}
		return storageData;
	};

	// requires context
	var clear = function() {
		this.remove();
	};

	// iKey can be string, regexp, or array of such
	// if iKey is undefined, returns false if store is empty, otherwise true
	var exists = function(iKey) {
		// var i;

		// consider the line below as an alternative to key enumeration. I don't think a localStorage value can ever be NULL (confirmed for Chrome (value BLOB NOT NULL); Didn't find anything specific on this in spec (http://www.w3.org/TR/webstorage/) other than that key and value must be DOMString (https://developer.mozilla.org/en/docs/Web/API/DOMString)). UPDATE: in FF v25, I was able to manually set a localStorage value to null. localStorage.getItem() subsequently returned null.
		// return localStorage.getItem(iKey) !== null;

		// iKey = iKey.toString();
		// for (i = localStorage.length - 1; i >= 0; i--) {
		// 	if (localStorage.key(i) === iKey) {
		// 		return true;
		// 	}
		// }

		// return false;

		return !!keys(false, iKey, true).length; // not super efficient but clean
	};

	var key = function(iIndex) {
		return localStorage.key(iIndex) || undefined;
	};

	// using 'count'/'size' because function 'length' property is not writeable. http://es5.github.io/#x15.3.5.1
	var size = function() {
		return localStorage.length;
	};

	// returns number of localStorage items
	var each = function(iIterator) {
		var key, i;

		for (i = 0; i < localStorage.length; i++) {
			key = localStorage.key(i);
			iIterator(key, get(key), i);
		}

		return i;
	};

	// HMM 2013-11-18: iSorted is redundant on Chrome since keys are sorted by default. Not so for FF. See: http://www.w3.org/TR/webstorage/#storage-0 ["...order of keys is user-agent defined..."]
	// if iKeySelectors, filter the returned set of keys accordingly
	var keys = function(iSorted, iKeySelectors, iStopAtFirstMatch, iArr) {
		var i;

		if (!iArr) {
			iArr = [];
		}

		if (arguments.length === 1) {
			if (!_.isBoolean(iSorted)) {
				iKeySelectors = iSorted;
				iSorted = undefined;
			}
		}

		if (_.isArray(iKeySelectors)) {
			for (i = 0; i < iKeySelectors.length; i++) {
				if (keys(false, iKeySelectors[i], iStopAtFirstMatch, iArr).length && iStopAtFirstMatch) {
					return iArr;
				}
			}

			iArr = _.uniq(_.flatten(iArr));
		} else if (!_.isUndefined(iKeySelectors) && !_.isRegExp(iKeySelectors) && !isValidKey(iKeySelectors)) {
			throw 'snorkel keys() failed. Not a valid key selector: ' + toValueString(iKeySelectors, '');
		} else {
			for (i = 0; i < localStorage.length; i++) {
				if (!iKeySelectors || (_.isRegExp(iKeySelectors) && iKeySelectors.test(localStorage.key(i)))) {
					iArr.push(localStorage.key(i));
				} else if (isValidKey(iKeySelectors) && iKeySelectors.toString() === localStorage.key(i)) {
					iArr.push(localStorage.key(i));
					break;
				}

				if (iStopAtFirstMatch && iArr.length) {
					return iArr;
				}
			}
		}

		if (iSorted) {
			return iArr.sort();
		}

		return iArr;
	};

	var values = function() {
		var i, arr = [];

		for (i = 0; i < localStorage.length; i++) {
			arr.push(get(localStorage.key(i)));
		}

		return arr;
	};

	var all = function() {
		return get();
	};

	// accepts handler and a keySelector or array of keySelector, where a keySelector is a non-null string or number (for literal, full match) or a RegExp object;  if no keySelector passed, handler applies to all items
	// calls handler AFTER item matching associated keySelectors is impacted, passing event type, key, value, and old value
	// iOptions: 
	//    scope: 'local', 'remote', or 'all' [default]; determines if event is raised only if snorkel change call occurred locally, only if snorkel change call occurred remotely, or both
	//    alwaysFireOnUpdate: true, false [default]; determines whether to fire 'updated' event without regard to old vs. new values (ie, even when old and new value are the same)
	var on = function(iHandler, iKeySelectors, iOptions) {
		if (arguments.length < 1 || arguments.length > 3) {
			throw 'snorkel on() call failed. 1-3 arguments expected, ' + arguments.length + ' present.';
		}

		if (!_.isFunction(iHandler)) {
			throw 'snorkel on() call failed. Expected function as first argument, received ' + toValueString(iHandler, '');
		}

		if (!_.isUndefined(iKeySelectors)) {
			if (_.isArray(iKeySelectors)) {
				iKeySelectors = _.flatten(iKeySelectors);

				_.each(iKeySelectors, function(el, i) {
					iKeySelectors[i] = normalizeKeySelector(el);
				});

				// iKeySelectors should now be a flat homogeneous array of RegExp elements
			} else {
				iKeySelectors = normalizeKeySelector(iKeySelectors);

				// iKeySelectors should now be a RegExp
			}
		}

		var scope = (iOptions && (iOptions.scope === 'local' && 'local' || iOptions.scope === 'remote' && 'remote')) || 'all';

		var listener = _.find(listeners, function(el) {
			return el.h === iHandler;
		});

		if (!listener) {
			listeners.push(
				listener = {
				s: scope,
				a: !! (iOptions && iOptions.alwaysFireOnUpdate), // alwaysFireOnUpdate
				h: iHandler, // handler:
				k: [] // keySelectors:
			});
		}

		if (_.isUndefined(iKeySelectors)) {
			listener.k = [];
		} else {
			listener.k = _.uniq(listener.k.concat(iKeySelectors), function(el) {
				return el.source + el.ignoreCase;
			});
		}

		if (scope === 'remote' || scope === 'all') {
			if (!remoteEventListenerCount) {
				originEvents.on('snorkel', snorkelEventHandler, 'remote');
			}

			remoteEventListenerCount++;
		}

		// console.dir(listeners);
	};

	var off = function(iHandler) {
		var index, listener;

		if (_.isFunction(iHandler)) {
			listener = _.find(listeners, function(el, i) {
				if (el.h === iHandler) {
					index = i;
					return true;
				}
				return false;
			});

			if (!_.isUndefined(index)) {
				if (listener.s === 'remote' || listener.s === 'all') {
					remoteEventListenerCount--;

					if (!remoteEventListenerCount) {
						originEvents.off('snorkel', snorkelEventHandler);
					}
				}

				listeners.splice(index, 1);
			}

			// console.dir(listeners);
		}
	};

	// requires context
	var canEmitLocally = function(iCanEmitLocally) {
		if (arguments.length) {
			this._canEmitLocally = iCanEmitLocally;
		}

		return this._canEmitLocally;
	};

	// requires context
	var canEmitRemotely = function(iCanEmitRemotely) {
		if (arguments.length) {
			this._canEmitRemotely = iCanEmitRemotely;
		}

		return this._canEmitRemotely;
	};

	// initializes and returns a snorkel context
	var snorkelInit = function(iCanEmitLocally, iCanEmitRemotely) {
		var ret = function() {
			return multi.apply(ret, arguments);
		};

		ret.get = get;
		ret.set = set;
		ret.remove = remove;
		ret.clear = clear;
		ret.exists = ret.has = exists;
		ret.key = key;
		ret.size = ret.count = size;
		ret.each = each;
		ret.keys = keys;
		ret.values = values;
		ret.all = ret.items = all;
		ret.on = ret.addKeyListener = on;
		ret.off = ret.removeKeyListener = off;
		ret.canEmitLocally = canEmitLocally;
		ret.canEmitRemotely = canEmitRemotely;
		ret.decodeValue = decodeValue;
		ret.version = VERSION;

		ret.canEmitLocally(_.isUndefined(iCanEmitLocally) || iCanEmitLocally);
		ret.canEmitRemotely(_.isUndefined(iCanEmitRemotely) || iCanEmitRemotely);

		if (!originEvents) {
			originEvents = true;
			originEvents = global.originEventsInit(false, true);
		}

		return ret;
	};

	// if (typeof define === 'function' && define.amd) {
	// 	define('snorkelInit', function() {
	// 		return snorkelInit;
	// 	});
	// } else if (typeof module === 'object' && module.exports) {
	// 	module.exports = snorkelInit;
	// } else {
	for (i in access) {
		global[i] = snorkelInit;
	}
	// }

}).call(this);


}).call(this);
