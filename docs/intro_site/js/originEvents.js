(function(undefined) {
	function escapeRegExp(iStr) {
		return iStr.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	}

	var count = 0;
	var baseKeyName = 'originEvents.nooxis.com.';
	var windowKeyName = baseKeyName + uuid.v4() + '.';
	var re = new RegExp('^' + escapeRegExp(baseKeyName) + '[0-9a-f]{32}\\.\\d+');
	var handler;

	window.addEventListener('storage', function(e) {
		if (handler && e.newValue && re.test(e.key)) {   // checking for "e.newValue" instead of "e.newValue !== null" because IE uses "" instead of null for e.oldValue and e.newValue when adding and removing storage items, respectively.
			handler.call(snorkel.decodeValue(e.newValue), false);
		}
	}, false);

	snorkel.on(function(e, k, v) {
		if (handler && (e === 'updated' || e === 'added')) {
			// console.log('originEvents (same window):', k, v);
			handler.call(v, true);
			snorkel.remove(k);
		}
	}, re);

	var originEvents = {
		trigger: function(iType, iMessage) {
			snorkel.set(windowKeyName + count, {
				//count: ++count,
				datetime: new Date(),
				type: iType,
				message: iMessage
			});
		},
		on: function(iHandler) {
			if (_.isFunction(iHandler)) {
				handler = iHandler;
			}
		},
		off: function() {
			handler = null;
		}
	};

	window.originEvents = originEvents;
}).call(this);
