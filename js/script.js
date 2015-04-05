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

	var ARTIST_ID = 3592216; // Interpreti Veneziani on Discogs.
	var NUMBER_OF_RELEASES = 18; // To keep track of how many releases are left to add on Discogs.
	var RELEASES_API_URL = 'http://api.discogs.com/artists/' + ARTIST_ID + '/releases';
	var WEBSITE_BASE_URL = 'http://www.interpretiveneziani.com/en';
	var CONCERTS_JSONP_URL = 'http://konstochvanligasaker.se/sanvidal.org/scripts/concerts.php';
	var AJAX_RETRIES = 3;
	var TIME_BETWEEN_RETRIES = 4000; // Milliseconds.

	// This will map Discogs id to a release's URL on the official website.
	var WEBSITE_PATHS = {
		5189934: '/disco-8-concerti-a-titolo.html',
		5195481: '/disco-139-strings-dances.html',
		5196226: '/disco-143-virtuoso.html',
		5199356: '/disco-175-geminiani-albinoni-vivaldi.html',
		5202488: '/disco-145-yumi-yamagata---dreaming-venice.html',
		5204682: '/disco-140-il-cimento-dellarmonia-e-dellinvenzione-i-le-quattro-stagioni.html',
		5315345: '/disco-138-allegro-con-fuoco.html',
		5315533: '/disco-172-bravo.html',
		5340346: '/disco-147-il-cimento-dellarmonia-e-dellinvenzione-ii.html',
		5343382: '/disco-141-davide-amadio---concerts-for-cello.html',
		5504886: '/disco-20-concerti.html',
		5563307: '/disco-174-genius.html',
		5833121: '/disco-142-il-maestro-delle-nazioni.html',
		5833461: '/disco-148-vivaldi---corelli.html',
		6344363: '/disco-176-emmanuele-baldini---interpreti-veneziani.html',
		6362952: '/disco-173-gianni-amadio---concerti-per-contrabbasso.html',
		6383594: '/disco-150-appassionato.html'
	};

	var SKIP_RELEASES = [5378462];

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

	// Fetch all releases from Discogs.
	getJSONP(RELEASES_API_URL,
	// Success callback.
	function (data) {
		// Log all fetched release data, might be good to look at.
		console.log('Successfully fetched release data:', data);

		// Sort all releases by date, latest first.
		var releases = _.sortBy(data.data.releases, 'year').reverse();

		// We will construct all elements outside the DOM for efficiency.
		var elementsToAdd = [];

		$.each(releases, function (index, release) {
			// We don't want some releases, because they are duplicates, or
			// something else.
			if (_.contains(SKIP_RELEASES, release.id)) {
				return;
			}

			// If there no website was found in our static data above, this
			// will default to the base URL instead.
			var url = WEBSITE_BASE_URL + (WEBSITE_PATHS[release.id] || '');

			// Split the release title on dash and only keep the first part,
			// i.e. throw away any subtitles, to avoid for our purposes
			// unnecessarily long titles.
			var title = release.title.split('-')[0];

			// If there is exactly one comma in the title, that is a good place
			// for a line break.
			var matches = title.match(/,/g);
			if (matches && matches.length === 1) {
				title = title.replace(',', ',<br />');
			}

			// Use local thumbnail image instead of Discogs, since getting them
			// requires authentication, which we cannot do.
			var thumb = '/img/thumbs/R-150-' + release.id + '.jpeg';

			elementsToAdd.push('' +
				'<div class="release">' +
				'<a class="image-link" href="' + url + '" target="_blank"><img src="' + thumb + '" width="150" height="150" data-adaptive-background="1" /></a>' +
				'<h3><a href="' + url + '" target="_blank">' + title + '</a></h3>' +
				'<em class="year">' + release.year + '</em>' +
				'</div>');
		});

		var releasesLeft = NUMBER_OF_RELEASES - releases.length + SKIP_RELEASES.length;
		if (releasesLeft > 0) {
			elementsToAdd.push('' +
				'<div class="release" style="background: none;">' +
				'<em class="year">(' + releasesLeft + ' release' + (releasesLeft > 1 ? 's' : '') + ' not yet<br /> added to <a href="http://www.discogs.com/artist/3592216-Interpreti-Veneziani" target="_blank">Discogs</a>.)</em>' +
				'</div>');
		}

		// Remove the "Loading..." text by emptying its parent, and add all elements.
		$('#releases').empty().append(elementsToAdd.join(''));

		// Because some titles span more than one line we get a height mismatch
		// that looks sub-beautiful. To remedy, single-line titles have extra
		// vertical margin with a total height of one line of text. Titles on
		// more than one line will not have this extra margin. The end result is
		// all box heights being equal.

		// First, figure out the height of one line of text in a title element.
		var titleElements = $('.release h3');
		var oneLineHeight = 10000;  // Just something really high to begin with.
		$.each(titleElements, function (index, element) {
			var h = $(element).height();
			if (h < oneLineHeight) {
				oneLineHeight = h;
			}
		});

		// Now, loop over all the title elements again and set a special class
		// on all titles that span more than one line.
		$.each(titleElements, function (index, element) {
			var el = $(element);
			var h = el.height();
			if (h > oneLineHeight) {
				el.addClass('minus-height');
			}
		});

		// Color all album backgrounds based on colors in the image.
		$.adaptiveBackground.run({
			parent: 'div.release'
		});
	},
	// Error callback.
	function () {
		$('#releases').empty().html('Could not fetch release data from Discogs, try <a href=".">reloading the page</a>.');
	});

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
