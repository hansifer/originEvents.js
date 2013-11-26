![](https://raw.github.com/hansifer/originEvents.js/gh-pages/images/logo_red.png)

### Trigger and handle events across same-origin tabs and iframes

Introduction
---

originEvents.js is a tiny JavaScript library that allows same-origin web pages (tabs, iframes, popups) running within the same browser instance to trigger and handle custom events within and across each other. [Visit the demo page](http://hansifer.github.io/originEvents.js/).

originEvents.js was initially created as a proof-of-concept for a [snorkel.js](http://hansifer.github.io/snorkel.js/) feature. Critical feedback, ideas, and pull requests are welcome.

How Does It Work?
---

In a nutshell, originEvents.js dispatches events by setting a temporary localStorage item with a custom event object. Such an event is received locally via [snorkel.js](http://hansifer.github.io/snorkel.js/) events and remotely by same-origin tabs, iframes, and popups via the "storage" event of [Web Storage](http://www.w3.org/TR/webstorage/). For additional technical details, [read on](#technical-notes).

API
---

Technical Notes
---

###Size

Original:  ~ 3.3k

Minified:  ~ 1.2k

Gzipped:   ~ 0.3k
