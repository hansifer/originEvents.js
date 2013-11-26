![](https://raw.github.com/hansifer/originEvents.js/gh-pages/images/logo_red.png)

### Trigger and handle events across same-origin tabs and iframes

Introduction
---

originEvents.js is a tiny JavaScript library that allows same-origin web pages (tabs, iframes, popups) running within the same (possibly offline) browser instance to trigger and handle custom events within and across each other. [Visit the demo page](http://hansifer.github.io/originEvents.js/).

originEvents.js was initially created as a proof-of-concept for a [snorkel.js](http://hansifer.github.io/snorkel.js/) feature. Critical feedback, ideas, and pull requests are welcome.

How Does It Work?
---

In a nutshell, originEvents.js dispatches events by setting a temporary localStorage item with a custom event object. Such an event is received locally via [snorkel.js](http://hansifer.github.io/snorkel.js/) events and remotely by same-origin tabs, iframes, and popups via the 'storage' event of [Web Storage](http://www.w3.org/TR/webstorage/). For additional technical details, [read on](#technical-notes).

API
---

###on (```string``` *eventType*, ```function``` *handler*)
Adds a listener for locally and remotely-triggered events of type eventType.
```js
originEvents.on('registration_complete',
   function (isLocal) { alert('Thanks for signing up, ' + this.message.username); });
```
###off (```string``` *eventType* [, ```function``` *handler*])
Removes a single or all listeners for locally and remotely-triggered events of type eventType.
```js
originEvents.off('registration_complete', someFunctionName);
originEvents.off('registration_complete');
```
###trigger (```string``` *eventType* [, ```any``` *message*])
Triggers an event of type eventType, passing message.
```js
originEvents.trigger('registration_complete', { username: 'lorem', email: 'lorem@ipsum.com' });
```
###triggerEnabled ([```boolean``` *enabled*])
Gets or sets whether originEvents.js dispatches events.
```js
originEvents.triggerEnabled(false);  // prevent originEvents from being raised
originEvents.triggerEnabled();       // returns false
```
###localListenerEnabled ([```boolean``` *enabled*])
Gets or sets whether originEvents.js allows locally-triggered events to be handled.
```js
originEvents.localListenerEnabled(false);  // prevent locally-triggered events from being handled
originEvents.localListenerEnabled();       // returns false
```
###remoteListenerEnabled ([```boolean``` *enabled*])
Gets or sets whether originEvents.js allows remotely-triggered events to be handled.
```js
originEvents.remoteListenerEnabled(false);  // prevent remotely-triggered events from being handled
originEvents.remoteListenerEnabled();       // returns false
```
<nowiki>*</nowiki>&nbsp;&nbsp;  ```any``` can be a ```number```, ```string```, ```boolean```, ```Date```, ```RegExp```, ```null```, ```undefined```, ```object```, ```array``` or arbitrarily-nested object/array of such.

Technical Notes
---

###Size

Original:  ~ 3.3k

Minified:  ~ 1.2k

Gzipped:   ~ 0.3k

###Dependencies

####Browser Features
-	[localStorage](http://caniuse.com/#search=localStorage)
-	[JSON](http://caniuse.com/#search=JSON)

####Libraries
-	[underscore](https://github.com/jashkenas/underscore)
-	[snorkel.js](https://github.com/hansifer/snorkel.js)
-	[node-uuid](https://github.com/broofa/node-uuid)

###Mechanism
When an event is triggered by an application via ```originEvents.trigger()```, originEvents.js uses [snorkel.js](http://hansifer.github.io/snorkel.js/) to set a custom event object (ie, an originEvent) that includes the event type, timestamp, and message (which can be a JavaScript primitive, Date, RegExp, null, undefined, or an object/array comprising such). This triggers the 'storage' event and queues up any associated handlers in each same-origin global context (tab, iframe, popup) that exists in the current browser instance. This is immediately followed by a snorkel 'updated' or 'added' event that is handled by originEvents.js so that it may qualify the corresponding originEvent for emission as a **local** originEvent and remove it from localStorage.

####Isn’t This a Hack?

Yes. Yes it is.

However, there isn’t to my knowledge a current alternative providing similar features. Particularly, offline cross-tab events (ie, non-targeted messages). If you know of one, please share!

###Internet Explorer Support

IE goes against the 'storage' event spec in two ways that we need to make special accommodation for:

1)	IE uses empty string instead of ```null``` for ```e.oldValue``` and ```e.newValue``` StorageEvent properties when items are added and removed, respectively.

2)	IE raises locally-sourced 'storage' events in addition to remote ones.

Compensating for the first exception is trivial. The second requires reliance on a global context identification scheme such that we can distinguish locally-sourced events from remote ones in the 'storage' event handler. We’re already using RFC4122 v4 UUIDs to generate an originEvent storage key name for use by a ```window```, so we’ll use this key name to filter locally-sourced events passing through the 'storage' event handler. Making use of UUIDs in this way is not bullet-proof, but operationally it’s good enough, at least for now.

Alternatives
---

JavaScript has had support for communication across same-origin windows for some time. More recently, [```window.postMessage()```](https://developer.mozilla.org/en-US/docs/Web/API/Window.postMessage) has enabled **cross-origin** communication as well. 

While the established approaches work fine for communicating across iframes/frames and windows returned by ```window.open()```, their reliance on ```window``` "handles" denies browser tabs from their reach.


