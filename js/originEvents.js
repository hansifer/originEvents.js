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
			console.dir(e);
			e.cancelBubble = true;
			e.stopPropagation();
			e.preventDefault();


			originEvent = snorkel.decodeValue(e.newValue);
			emitLocally(originEvent.type, originEvent.message, originEvent.datetime, true);
		}

		return false;
	};

	var emitLocally = function(iType, iMessage, iDatetime, isRemoteEvent) {
		_.each(listeners[iType], function(handler) {
			if (handler.s === 'all' || ((handler.s === 'remote' && isRemoteEvent) || (handler.s === 'local' && !isRemoteEvent))) {
				handler.h(iType, iMessage, iDatetime, isRemoteEvent);
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
	var trigger = function(iType, iMessage) {
		var key;
		var datetime = new Date();

		if (this.canEmitRemotely()) {
			snorkel.set(key = windowKeyName + (incrementor++), {
				// incrementor: ++incrementor,
				datetime: datetime,
				type: iType,
				message: iMessage
			});

			localStorage.removeItem(key); // don't incur unnecessary overhead for snorkel features we don't need
		}

		if (this.canEmitLocally()) {
			emitLocally(iType, iMessage, datetime);
		}
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
