$(document).ready(function() {

    module("one");

    var originEvents = originEventsInit();

    test("events", function() {
		expect(1);

		ok(originEvents.canEmitLocally());
    });

});
