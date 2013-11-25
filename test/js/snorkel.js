//     snorkel.js 1.0
//     http://snorkeljs.org
//     (c) 2013 Hans Meyer
//     snorkel may be freely distributed under the MIT license.

(function(undefined) {
	// set global to 'window' (browser) or 'exports' (server)
	var global = this;

	// record access names and current references
	var access = {};
	access.snorkel = global.snorkel;
	access.J = global.J;

	var listeners = [];
	var emitEnabled = true;

	var localStorage = global.localStorage;

	var i;

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
		if (snorkel.exists(iKey)) {
			return decodeValue(localStorage.getItem(iKey));
		}
	};

	var setStoredValue = function(iKey, iValue, iEncodedValue) {
		var oldValue;

		if (_.isUndefined(iEncodedValue)) {
			iEncodedValue = encodeValue(iValue);
		}

		if (emitRequired()) {
			if (snorkel.exists(iKey)) {
				oldValue = snorkel.get(iKey);
				localStorage.setItem(iKey, iEncodedValue);
				emit('updated', iKey, iValue, oldValue);
			} else {
				localStorage.setItem(iKey, iEncodedValue);
				emit('added', iKey, iValue);
			}
		} else {
			localStorage.setItem(iKey, iEncodedValue);
		}
	};

	// --- EVENTS ---

	var emit = function(iEventType, iKey, iValue, iOldValue) {
		var i, j;

		if (isValidKey(iKey)) {
			iKey = iKey.toString();

			//console.log('emission check:', iKey, iValue);
			for (i = 0; i < listeners.length; i++) {
				// console.log(listeners[i].h.name);
				for (j = 0; j < listeners[i].k.length; j++) {
					if (listeners[i].k[j].test(iKey)) {
						// console.log('match test SUCCESS:', listeners[i].k[j].source, iKey);
						listeners[i].h.call(snorkel, iEventType, iKey, iValue, (arguments.length === 3 ? iValue : iOldValue));
						break; // only one call per handler even if multiple keySelectors qualify
						// } else {
						// console.log('match test FAIL:', listeners[i].k[j].source, iKey);
					}
				}
			}
		}
	};

	var emitRequired = function() {
		return emitEnabled && listeners.length;
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
	var snorkel = function() {
		var iKey;

		if (arguments.length > 2) {
			throw 'snorkel call failed. 0-2 arguments expected, ' + arguments.length + ' present.';
		}

		// "snorkel()" get call; return store in its entirety as a JS object

		if (!arguments.length) {
			return snorkel.get();
		}

		iKey = arguments[0];

		// "snorkel('id','foo')" set call

		if (arguments.length === 2) {
			return snorkel.set(iKey, arguments[1]);
		}

		// "snorkel({id:123,name:'foo'})" set call; note that this only considers enumerable properties

		if (_.isObject(iKey) && !_.isArray(iKey)) {
			return snorkel.set(iKey);
		}

		// "snorkel('id')" get call

		return snorkel.get(iKey);
	};

	snorkel.VERSION = '1.0';

	snorkel.noConflict = function() {
		var i;

		if (arguments.length) {
			_.each(arguments, function(arg) {
				if (arg in access) {
					global[arg] = access[arg]; // reset original reference
				}
			});
		} else {
			for (i in access) {
				global[i] = access[i];
			}
		}

		return snorkel;
	};

	// iKey may be a non-empty string, number, or arbitrarily-nested array of such
	// if single-key (ie, primitive) arg, returns corresponding decoded stored value; non-existent key yields undefined or iDefault if provided
	// if multi-key (ie, array) arg, returns flat array of all corresponding decoded stored values; non-existent-key values are filled with undefined or iDefault if provided
	// if no args, returns object representation of entire data store
	// iDefault may be any value. If it's a function, the default value of the key is determined by the value of a call to the function, passing it the key.
	snorkel.get = function(iKey, iDefault) {
		var ret, i;

		if (arguments.length > 2) {
			throw 'snorkel get failed. 0-2 arguments required, ' + arguments.length + ' present.';
		}

		if (!arguments.length) {
			ret = {};

			for (i = 0; i < localStorage.length; i++) {
				iKey = localStorage.key(i);
				ret[iKey] = snorkel.get(iKey);
			}

			return ret;
		}

		if (_.isArray(iKey)) {
			return _.map(_.flatten(iKey), function(iKey) {
				return snorkel.get(iKey, iDefault);
			});
		}

		checkKey(iKey);

		if (_.isUndefined(iDefault) || snorkel.exists(iKey)) {
			return getDecodedStoredValue(iKey);
		}

		if (_.isFunction(iDefault)) {
			return iDefault(iKey); // TODO: iKey.toString() here?
		} else {
			return iDefault;
		}
	};

	snorkel.decodeValue = decodeValue;

	// iKey can be a non-empty string, number, arbitrarily-nested array of such (in which case iValue is set for each key in the array), or set object (in which case iValue must not be passed)
	// if single-key (ie, primitive) or multi-key (ie, array) arg, returns iValue.
	// if set object, returns array of set values.
	snorkel.set = function(iKey, iValue) {
		var encodedValue, ret;

		if (arguments.length === 1) {
			if (!_.isObject(iKey) || _.isArray(iKey)) {
				throw 'snorkel set failed. Calling set() with a single argument requires a set object, but actual argument is ' + toValueString(iKey, '');
			}

			// check all properties first so set is atomic

			_.each(iKey, function(iValue, iKey) {
				checkKey(iKey);
				checkValue(iValue);
			});

			ret = [];
			_.each(iKey, function(iValue, iKey) {
				setStoredValue(iKey, iValue);
				ret.push(iValue);
			});

			return ret;
		}

		if (arguments.length !== 2) {
			throw 'snorkel set failed. A single set object or 2 arguments required, ' + arguments.length + ' present.';
		}

		checkValue(iValue);

		if (_.isArray(iKey)) {
			iKey = _.flatten(iKey);

			// check each key first to make set atomic

			_.each(iKey, function(iKey) {
				checkKey(iKey);
			});

			encodedValue = encodeValue(iValue);
			_.each(iKey, function(iKey) {
				setStoredValue(iKey, iValue, encodedValue);
			});
		} else if (checkKey(iKey)) {
			setStoredValue(iKey, iValue);
		}

		return iValue;
	};

	// iKey may be a non-empty string, number, or arbitrarily-nested array of such
	// if single-key (ie, primitive) arg, return decoded stored value of removed item; non-existent key yields undefined or iDefault if provided
	// if multi-key (ie, array) arg,  return flat array of decoded stored values of all removed items; non-existent-key values are filled with undefined or iDefault if provided
	// if no args, remove all items and return object representation of entire (removed) data store.
	snorkel.remove = function(iKey, iDefault) {
		var storageData;

		if (arguments.length > 2) {
			throw 'snorkel remove failed. 0-2 arguments required, ' + arguments.length + ' present.';
		}

		if (arguments.length) {
			if (_.isArray(iKey)) {
				iKey = _.flatten(iKey);

				// check each key first to make remove atomic

				_.each(iKey, function(iKey) {
					checkKey(iKey);
				});

				return _.map(iKey, function(iKey) {
					return snorkel.remove(iKey, iDefault);
				});
			}

			checkKey(iKey);

			storageData = snorkel.get(iKey, iDefault);
			if (snorkel.exists(iKey)) {
				localStorage.removeItem(iKey);
				if (emitRequired()) {
					emit('removed', iKey, storageData);
				}
			}
			return storageData;
		}

		// remove all stored items
		storageData = snorkel.all();
		if (localStorage.length) {
			localStorage.clear();
			if (emitRequired()) {
				_.each(storageData, function(iValue, iKey) {
					emit('removed', iKey, iValue);
				});
			}
		}
		return storageData;
	};

	snorkel.clear = function() {
		snorkel.remove();
	};

	snorkel.exists = snorkel.has = function(iKey) {
		var i;

		// consider the line below as an alternative to key enumeration. I don't think a localStorage value can ever be NULL (confirmed for Chrome (value BLOB NOT NULL); Didn't find anything specific on this in spec (http://www.w3.org/TR/webstorage/) other than that key and value must be DOMString (https://developer.mozilla.org/en/docs/Web/API/DOMString)). UPDATE: in FF v25, I was able to manually set a localStorage value to null. localStorage.getItem() subsequently returned null.
		// return localStorage.getItem(iKey) !== null;

		iKey = iKey.toString();
		for (i = localStorage.length - 1; i >= 0; i--) {
			if (localStorage.key(i) === iKey) {
				return true;
			}
		}

		return false;
	};

	snorkel.key = function(iIndex) {
		return localStorage.key(iIndex) || undefined;
	};

	// using 'count'/'size' because function 'length' property is not writeable. http://es5.github.io/#x15.3.5.1
	snorkel.size = snorkel.count = function() {
		return localStorage.length;
	};

	// returns number of localStorage items
	snorkel.each = function(iIterator) {
		var key, i;

		for (i = 0; i < localStorage.length; i++) {
			key = localStorage.key(i);
			iIterator(key, snorkel(key), i);
		}

		return i;
	};

	// HMM 2013-11-18: iSorted is redundant on Chrome since keys are sorted by default. Not so for FF. See: http://www.w3.org/TR/webstorage/#storage-0 ["...order of keys is user-agent defined..."]
	snorkel.keys = function(iSorted) {
		var i, arr = [];

		for (i = 0; i < localStorage.length; i++) {
			arr.push(localStorage.key(i));
		}

		if (iSorted) {
			return arr.sort();
		}

		return arr;
	};

	snorkel.values = function() {
		var i, arr = [];

		for (i = 0; i < localStorage.length; i++) {
			arr.push(snorkel(localStorage.key(i)));
		}

		return arr;
	};

	snorkel.all = snorkel.items = function() {
		return snorkel();
	};

	// accepts handler and one or more keySelector, where a keySelector is a string (literal, full match) or a RegExp object;  if no keySelector passed, handler applies to all items
	// calls handler AFTER item matching associated keySelectors is impacted, passing key, value, and event type;
	snorkel.on = snorkel.addKeyListener = function(iHandler) {
		var listener, specifiedKeySelectors;

		if (_.isFunction(iHandler)) {
			listener = _.find(listeners, function(el) {
				return el.h === iHandler;
			});

			if (!listener) {
				listeners.push(
					listener = {
					h: iHandler, // handler:
					k: [] // keySelectors:
				});
			}

			specifiedKeySelectors = _.flatten(Array.prototype.slice.call(arguments, 1));

			_.each(specifiedKeySelectors, function(el, i) {
				if (isValidKey(el)) {
					try {
						specifiedKeySelectors[i] = new RegExp('^' + escapeRegExp(el) + '$');
					} catch (ex) {}
				}
			});

			specifiedKeySelectors = _.filter(specifiedKeySelectors, function(el) {
				return _.isRegExp(el);
			});

			// specifiedKeySelectors should now be a flat homogeneous array of RegExp elements

			listener.k = _.uniq(listener.k.concat(specifiedKeySelectors), function(el) {
				return el.source + el.ignoreCase;
			});
		}

		// console.dir(listeners);
	};

	snorkel.off = snorkel.removeKeyListener = function(iHandler) {
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
				listeners.splice(index, 1);
			}

			// console.dir(listeners);
		}
	};

	snorkel.silent = function(iSilent) {
		if (arguments.length) {
			emitEnabled = !iSilent;
		}

		return emitEnabled;
	};

	if (typeof define === 'function' && define.amd) {
		define('snorkel', function() {
			return snorkel;
		});
	} else if (typeof module === 'object' && module.exports) {
		module.exports = snorkel;
	} else {
		for (i in access) {
			global[i] = snorkel;
		}
	}

}).call(this);
