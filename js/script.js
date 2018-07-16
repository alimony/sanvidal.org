$(document).ready(function () {
    'use strict';

    // This function will determine if the given date is today based on year,
    // month and day only. This is useful for displaying concert dates in the
    // near future differently, i.e. with some more urgency.
    function isToday(date) {
        var now = moment();
        return (date.year() === now.year() &&
            date.month() === now.month() &&
            date.date() === now.date());
    }

    var WEBSITE_BASE_URL = 'http://www.interpretiveneziani.com/en';
    var CONCERTS_JSONP_URL = 'http://konstochvanligasaker.se/sanvidal.org/scripts/concerts.php';
    var AJAX_RETRIES = 3;
    var TIME_BETWEEN_RETRIES = 4000; // Milliseconds.

    // This is a general purpose function for making Ajax calls over JSONP with
    // retries and error handling, the latter due to the fact that such calls
    // in jQuery will fail silently instead of triggering any error callback.
    function getJSONP(url, successCallback, errorCallback) {
        // Keep track of success and retries for this specific function.
        var success = false;
        var retries = 0;

        // Kick off the initial attempt.
        fetch();

        function fetch() {
            if (success) {
                return;
            }
            $.ajax({
                url: url,
                dataType: 'jsonp',
                success: function (data) {
                    success = true;
                    successCallback(data);
                }
            });
            if (retries < AJAX_RETRIES) {
                if (retries > 0) {
                    console.log('Could not fetch data from ' + url + ', trying again.');
                }
                retries++;
                window.setTimeout(fetch, TIME_BETWEEN_RETRIES);
            }
            else {
                console.log('Total failure when fetching data from ' + url + ', aborting.');
                errorCallback();
            }
        }
    }

    // Fetch all upcoming concert dates and wrestle them into a simpler object.
    getJSONP(CONCERTS_JSONP_URL,
    // Success callback.
    function (data) {
        console.log('Successfully fetched concert data:', { data: data });

        var calendar = {};
        // This object will at the end hold a structure of dates like this:
        // calendar = {
        //     [year]: {
        //         [month]: {
        //             [day]: url,
        //             [day]: url,
        //             [day]: url,
        //             ...
        //         },
        //         ...
        //     },
        //     ...
        // }
        var elementsToAdd = [];
        $.each(data, function (index, element) {
            var date = moment(element[0]);
            var now = moment();
            if (date > now) {
                var year = date.year();
                var month = date.month();
                var day = date.date();
                var url = WEBSITE_BASE_URL + '/' + element[1];
                if (!(year in calendar)) {
                    calendar[year] = {};
                }
                if (!(month in calendar[year])) {
                    calendar[year][month] = {};
                }
                calendar[year][month][day] = url;
            }
        });
        // Now that we have a nicely sorted object, build HTML from it.
        $.each(_.keys(calendar), function (index, year) {
            elementsToAdd.push('<h3>' + year + '</h3>');
            $.each(_.keys(calendar[year]), function (index, month) {
                elementsToAdd.push('<h4>' + moment.months()[month] + ':');
                $.each(_.keys(calendar[year][month]), function (index, day) {
                    elementsToAdd.push('<a href="' + calendar[year][month][day] + '" target="_blank">' + day + '</a>');
                    var date = moment(year + '-' + (+month + 1) + '-' + day);
                    if (isToday(date)) {
                        elementsToAdd.push('<em class="today">(tonight)</em>');
                    }
                });
                elementsToAdd.push('</h4>');
            });
        });
        $('#concerts').empty().append(elementsToAdd.join(''));
    },
    // Error callback.
    function () {
        $('#concerts').empty().html('Could not fetch concert data, try <a class="error" href=".">reloading the page</a>.');
    });
});
