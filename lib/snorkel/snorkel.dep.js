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
