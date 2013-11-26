//     originEvents.js 0.1.0
//     http://originEventsJS.org
//     (c) 2013 Hans Meyer
//     originEvents.js may be freely distributed under the MIT license.

(function(undefined) {
	var global = this;

	var incrementor = 0;
	var baseKeyName = 'originEvents.nooxis.com.';
	var windowKeyName = baseKeyName + uuid.v4() + '.';
	var re = new RegExp('^' + baseKeyName.replace('.', '\\.') + '[0-9a-f]{32}\\.\\d+$');

	var triggerEnabled = false;
	var localListenerEnabled = false;
	var remoteListenerEnabled = false;

	var listeners = {};

	var remoteStorageEventHandler = function(e) {
		// Checking for "e.newValue" instead of "e.newValue !== null" because IE uses empty string instead of null for e.oldValue and e.newValue when adding and removing storage items, respectively.
		// Third condition is required for IE only since it raises locally-sourced "storage" events (against spec) in addition to remote ones
		if (e.newValue && re.test(e.key) && e.key.substring(0, windowKeyName.length) !== windowKeyName) {
			emit(snorkel.decodeValue(e.newValue), false);
		}
	};

	var localStorageEventHandler = function(e, k, v) {
		if (e === 'updated' || e === 'added') {
			if (localListenerEnabled) {
				emit(v, true);
			}

			snorkel.remove(k);
		}
	};

	var emit = function(iOriginEvent, iIsLocal) {
		_.each(listeners[iOriginEvent.type], function(handler) {
			handler.call(iOriginEvent, iIsLocal);
		});
	};

	var originEvents = {};


	originEvents.on = function(iType, iHandler) {
		if (!(iType in listeners)) {
			listeners[iType] = [];
		}

		if (!_.contains(listeners[iType], iHandler)) {
			listeners[iType].push(iHandler);
		}
	};

	originEvents.off = function(iType, iHandler) {
		if (iType in listeners) {
			if (iHandler) {
				listeners[iType].splice(listeners[iType].indexOf(iHandler), 1);
			} else {
				delete listeners[iType];
			}
		}
	};

	originEvents.trigger = function(iType, iMessage) {
		if (triggerEnabled) {
			snorkel.set(windowKeyName + (incrementor++), {
				// incrementor: ++incrementor,
				datetime: new Date(),
				type: iType,
				message: iMessage
			});
		}
	};

	originEvents.triggerEnabled = function(iEnabled) {
		if (arguments.length) {
			if (iEnabled && !triggerEnabled) {
				snorkel.on(localStorageEventHandler, re);
			} else if (!iEnabled && triggerEnabled) {
				snorkel.off(localStorageEventHandler, re);
			}

			triggerEnabled = iEnabled;
		}

		return triggerEnabled;
	};

	originEvents.localListenerEnabled = function(iEnabled) {
		if (arguments.length) {
			localListenerEnabled = iEnabled;
		}

		return localListenerEnabled;
	};

	originEvents.remoteListenerEnabled = function(iEnabled) {
		if (arguments.length) {
			if (iEnabled && !remoteListenerEnabled) {
				global.addEventListener('storage', remoteStorageEventHandler, false);
			} else if (!iEnabled && remoteListenerEnabled) {
				global.removeEventListener('storage', remoteStorageEventHandler, false);
			}

			remoteListenerEnabled = iEnabled;
		}

		return remoteListenerEnabled;
	};

	// listen for local and remote storage events
	originEvents.triggerEnabled(true);
	originEvents.remoteListenerEnabled(true);
	originEvents.localListenerEnabled(true);

	global.originEvents = originEvents;
}).call(this);
