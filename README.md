![](https://raw.github.com/hansifer/originEvents.js/gh-pages/images/logo_red.png)

### Trigger and handle events across same-origin tabs and iframes

Introduction
---

originEvents.js is a tiny JavaScript library that allows same-origin web pages (tabs, iframes, popups) running within the same (possibly offline) browser instance to trigger and handle custom events within and across each other. [**See it in action**](http://hansifer.github.io/originEvents.js/).

originEvents.js was initially created as a proof-of-concept for a [snorkel.js](http://hansifer.github.io/snorkel.js/) feature. Critical feedback, ideas, and pull requests are welcome.

How Does It Work?
---

In a nutshell, originEvents.js implements cross-tab events by setting a temporary localStorage item with a custom event object. Such an event is received remotely by same-origin tabs, iframes, and popups via the 'storage' event of [Web Storage](http://www.w3.org/TR/webstorage/). Local (ie, same global context) events are implemented through standard means. For additional technical details, [read on](#technical-notes).

API
---

###window.originEventsInit ([```boolean``` *canEmitLocally*, ```boolean``` *canEmitRemotely*])
Initializes and returns an originEvents context object to use for further API calls. Default value for each option is ```true```.
```js
// return a default-initialized originEvents context object
var originEvents = window.originEventsInit();   

// return an originEvents context object that can emit events 
// only to OTHER same-origin tabs/iframes/popups
var originEvents = window.originEventsInit(false);  
```
###on (```string``` *eventType*, ```function``` *handler* [, ```string``` *scope*])
Adds a handler for an *eventType*. Optional *scope* of 'local' or 'remote' limits the types of events this handler processes.
```js
originEvents.on('registration_complete',
   function (iType, iMessage, iDatetime, isRemoteEvent) { 
      alert('Thanks for signing up, ' + iMessage.username); 
   });
```
###off (```string``` *eventType* [, ```function``` *handler*])
Removes a handler for an *eventType*. If *handler* is not specified, all handlers for *eventType* are removed.
```js
originEvents.off('registration_complete', someFunctionName);
originEvents.off('registration_complete');  // remove all handlers for eventType
```
###trigger (```string``` *eventType* [, ```any``` *message*])
Triggers an event of *eventType*, passing *message*.
```js
originEvents.trigger('registration_complete', { username: 'lorem', email: 'lorem@ipsum.com' });
```
###canEmitLocally ([```boolean``` *canEmitLocally*])
Gets or sets whether originEvents.js emits locally-triggered events locally (ie, within the same global context).
```js
// prevent locally-triggered events from being emitted locally
originEvents.canEmitLocally(false);  

// returns true or false
originEvents.canEmitLocally();       
```
###canEmitRemotely ([```boolean``` *canEmitRemotely*])
Gets or sets whether originEvents.js emits locally-triggered events to remote tabs/iframes/popups.
```js
// prevent locally-triggered events from being emitted to remote tabs/iframes/popups
originEvents.canEmitRemotely(false);  

// returns true or false
originEvents.canEmitRemotely();       
```
<nowiki>*</nowiki>&nbsp;&nbsp;  ```any``` can be a ```number```, ```string```, ```boolean```, ```Date```, ```RegExp```, ```null```, ```undefined```, ```object```, ```array``` or arbitrarily-nested object/array of such.

Technical Notes
---

###Size

Original:  ~ 4.8k

Minified:  ~ 1.6k

Gzipped:   ~ 0.4k

###Dependencies

####Browser Features
-	[localStorage](http://caniuse.com/#search=localStorage)
-	[JSON](http://caniuse.com/#search=JSON)

####Libraries
-	[underscore](https://github.com/jashkenas/underscore)
-	[snorkel.js](https://github.com/hansifer/snorkel.js)
-	[node-uuid](https://github.com/broofa/node-uuid)

###Mechanism

####Remote Events

When an event is triggered by an application via ```originEvents.trigger()```, originEvents.js uses [snorkel.js](http://hansifer.github.io/snorkel.js/) to set a custom event object (ie, an originEvent) that includes the event type, timestamp, and message (which can be a JavaScript primitive, Date, RegExp, null, undefined, or an object/array comprising such). This triggers the 'storage' event and queues up any associated handler calls in each same-origin global context (tab, iframe, popup) that exists in the current browser instance. The snorkel set is immediately followed by a localStorage.removeItem() call to clean up the dispatched event.

####Local Events

Local events are implemented similarly to many event libraries (ie, trigger leads to direct handler call).

####Isn’t This a Hack?

Yes. Yes it is.

But only in the sense that we're making use of an established browser facility in a manner that is different from its intended use, which doesn't say anything about viability. 

Also, there isn’t to my knowledge a current alternative providing similar features. Particularly, offline cross-tab events (ie, non-targeted messages).

####Isn’t This a Performance Liability?

The short answer is *no*, but there are multiple factors to consider. It's interesting to note that on Chrome (and possibly others), the way originEvents leverages localStorage does not actually incur any disk I/O.

Here's [a pretty good article by Nicholas Zakas on localStorage performance](http://calendar.perfplanet.com/2012/is-localstorage-performance-a-problem/).

###Internet Explorer Support

IE goes against the 'storage' event spec in two ways that we need to make special accommodation for:

1)	IE uses empty string instead of ```null``` for ```e.oldValue``` and ```e.newValue``` StorageEvent properties when items are added and removed, respectively.

2)	IE raises locally-initiated 'storage' events in addition to remote ones.

Compensating for the first exception is trivial. The second requires reliance on a global context identification scheme such that we can distinguish locally-initiated events from remote ones in the 'storage' event handler. We’re already using RFC4122 v4 UUIDs to generate an originEvent storage key name for use by a ```window```, so we’ll use this key name to filter locally-initiated events passing through the 'storage' event handler. Making use of UUIDs to establish ```window``` identity is not bullet-proof, but operationally it’s good enough, at least for now.

Alternatives
---

JavaScript has had support for communication across same-origin windows for some time. More recently, [```window.postMessage()```](https://developer.mozilla.org/en-US/docs/Web/API/Window.postMessage) has enabled **cross-origin** communication as well. 

While the established approaches work fine for communicating across iframes/frames and windows created by ```window.open()```, their reliance on ```window``` "handles" keeps browser **tabs** out of their reach.
