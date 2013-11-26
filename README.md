![logoFullBleed_red.png](https://raw.github.com/hansifer/originEvents.js/gh-pages/images/logoFullBleed_red.png)

### Trigger and handle events across same-origin tabs and iframes

Introduction
---

originEvents.js is a tiny JavaScript library that allows same-origin web pages (tabs, iframes, popups) running within the same browser instance to trigger and handle custom events within and across each other. ![Click here for a demo](http://hansifer.github.io/originEvents.js/).

How Does It Work?
---

In a nutshell, originEvents.js dispatches events by setting a temporary localStorage item with a custom event object. Such an event is received locally via snorkel.js events and remotely by same-origin tabs, iframes, and popups via the "storage" event of Web Storage. Visit the project's GitHub page for more technical details.

API
---

Technical Notes
---------------

###Size

Original:  ~ 3.3k

Minified:  ~ 1.2k

Gzipped:   ~ 0.3k
