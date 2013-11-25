//     originEvents.js 0.1.0
//     http://originEventsJS.org
//     (c) 2013 Hans Meyer
//     originEvents.js may be freely distributed under the MIT license.

(function(undefined) {
	var global = this;

	var count = 0;
	var baseKeyName = 'originEvents.nooxis.com.';
	var windowKeyName = baseKeyName + uuid.v4() + '.';
	var re = new RegExp('^' + baseKeyName.replace('.', '\\.') + '[0-9a-f]{32}\\.\\d+');

	var listeners = {};

	var remoteStorageEventHandler = function(e) {
		console.dir(e);
		// checking for "e.newValue" instead of "e.newValue !== null" because IE uses "" instead of null for e.oldValue and e.newValue when adding and removing storage items, respectively.
		if (e.newValue && re.test(e.key)) {
			emit(snorkel.decodeValue(e.newValue), false);
		}
	};

	var localStorageEventHandler = function(e, k, v) {
		if (e === 'updated' || e === 'added') {
			emit(v, true);
			snorkel.remove(k);
		}
	};

	var emit = function(iOriginEvent, iIsLocal) {
		_.each(listeners[iOriginEvent.type], function(handler) {
			handler.call(iOriginEvent, iIsLocal);
		});
	};

	// listen for local and remote storage events
	snorkel.on(localStorageEventHandler, re);
	global.addEventListener('storage', remoteStorageEventHandler, false);

	var originEvents = {
		on: function(iType, iHandler) {
			if (!(iType in listeners)) {
				listeners[iType] = [];
			}

			if (!_.contains(listeners[iType], iHandler)) {
				listeners[iType].push(iHandler);
			}
		},
		off: function(iType, iHandler) {
			if (iType in listeners) {
				if (iHandler) {
					listeners[iType].splice(listeners[iType].indexOf(iHandler), 1);
				} else {
					delete listeners[iType];
				}
			}
		},
		trigger: function(iType, iMessage) {
			if (triggerEnabled) {
				snorkel.set(windowKeyName + (count++), {
					// count: ++count,
					datetime: new Date(),
					type: iType,
					message: iMessage
				});
			}
		}
	};

	originEvents.triggerEnabled = true;
	originEvents.localListenerEnabled = true;
	originEvents.remoteListenerEnabled = true;

	global.originEvents = originEvents;
}).call(this);
