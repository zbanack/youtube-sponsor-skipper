const SCAN_INTERVAL_SECS = 1;
const SECONDS_TO_SKIP_DEFAULT = 2;
const CAPTION_CACHE_SIZE = 30;

// vars
let matches, skipping, i, j, content;
let trigger_list = [];
let persistence_list = [];
let recent_caption_words = [];
let scannable_text = "";
let word_that_triggered_sponsor_segment = "";
let inside_sponsored_segment = false;
let still_in_ad = false;
let new_content = [];
let consistent_failures = 0;
let scan_interval;
let recent_word_to_persist = "";

// init
window.onload = function() {

	console.log("Starting Sponsor Skipper");

	// load trigger list from storage, clean strings
	chrome.storage.sync.get("trigger_list", function(items) {
		if (!chrome.runtime.error) 
			trigger_list = items["trigger_list"].toLowerCase().split(",").map(s => s.trim());
	});

	// load persistence list from storage, clean strings
	chrome.storage.sync.get("persistence_list", function(items) {
		if (!chrome.runtime.error) 
			persistence_list = items["persistence_list"].toLowerCase().split(",").map(s => s.trim());
	});

	// @TODO this is dirty... stores 'seconds to skip' value in a div's innerHTML
	// this is basically a page-wide global we need to reference in the YT video player scope
	let seconds_to_skip_div = document.createElement("div");
	seconds_to_skip_div.setAttribute("id", "__seconds_to_skip__");
	seconds_to_skip_div.innerHTML = SECONDS_TO_SKIP_DEFAULT;

	// similarly, store direction of skim in div
	let = temp_direction_div = document.createElement("div");
	temp_direction_div.setAttribute("id", "__temp_direction__");
	temp_direction_div.innerHTML = "1";

	// save timestamp of most recently-encountered persistence word
	let = sponsor_ends_at_div = document.createElement("div");
	sponsor_ends_at_div.setAttribute("id", "__sponsor_ends_at__");
	sponsor_ends_at_div.innerHTML = "1";

	// save timestamp of most recently-encountered persistence word
	let = persistent_happening_div = document.createElement("div");
	persistent_happening_div.setAttribute("id", "__persistence_happening__");
	persistent_happening_div.innerHTML = "0";

	chrome.storage.sync.get("secs", function(items) {
	    if (!chrome.runtime.error)
	    	seconds_to_skip_div.innerHTML = items["secs"];
	});

	document.body.appendChild(seconds_to_skip_div); 
	document.body.appendChild(temp_direction_div); 
	document.body.appendChild(sponsor_ends_at_div); 
	document.body.appendChild(persistent_happening_div); 

	// call parser every n second
	scan_interval = setInterval(function() {
	    sponsor_check()
	}, SCAN_INTERVAL_SECS * 1000);
}

// parse and clean captions
function scrape_captions() {
	// locate YT caption divs on page
	matches = document.getElementsByClassName("ytp-caption-segment");

	if (matches.length<1) return false;

	persistent_happening_div.innerHTML = 0;

	// iterate over caption divs
	for (i = 0; i < matches.length; i++) {

		// clean caption content
		content = matches[i].innerHTML.toLowerCase();

		// update caption collection
		recent_caption_words = recent_caption_words.concat();

		new_content = content.split(" ");


		// only push new words into recent words
		// @TODO needs better/cleaner logic here. YTer w/ small vocabulary could mess this up
		for(j = 0; j < new_content.length; j++) {
			if (!recent_caption_words.includes(new_content[j])) 
				recent_caption_words.push(new_content[j]);

			// if word is in persistence list, update sponsor-ending div
			if (persistence_list.includes(new_content[j])) {
				persistent_happening_div.innerHTML = 1;
			}
		}
	}

	// remove recent persistence word from array
	// remove(recent_caption_words, recent_word_to_persist);

	// limit size of caption collection
	while(recent_caption_words.length>CAPTION_CACHE_SIZE)
		recent_caption_words.shift();

	scannable_text = recent_caption_words.join(" ").trim();
	scannable_text = " " + scannable_text;

	return true;
}

// checks the capations for sponsors
function sponsor_check() {

	// if captions are disabled, don't run code
	if (!scrape_captions()) {
		console.log("Captions disabled");
		return;
	}

	// not inside any sponsored content at the moment
	if (!inside_sponsored_segment) {

		// encountered some form of the word "sponsor"
		if (scannable_text.includes("sponsor")) {

			// cross reference caption words against blacklist
			for(j = 0; j < trigger_list.length; j++) {

				// sanity
				if (trigger_list[j] == null) continue;
				if (trigger_list[j].length<2) continue;

				// we've encountered a sponsored segment!
				if (scannable_text.includes(trigger_list[j])) {
					inside_sponsored_segment = true;
					word_that_triggered_sponsor_segment = trigger_list[j];
					console.log("Sponsor segment evoked due to encountering: \"" + word_that_triggered_sponsor_segment + "\"");
					skip_ahead(1);

					// speed up code check during sponsored segment
					clearInterval(scan_interval);
					scan_interval = setInterval(function() {
					    sponsor_check()
					}, 100);
				break;
				}
			}
		}
	}

	// inside sponsored content
	if (inside_sponsored_segment) {

		still_in_ad = false;

		// cross reference caption words against persistence list
		for(j = 0; j < persistence_list.length; j++) {

			// sanity
			if (persistence_list[j] == null) continue;
			if (persistence_list[j].length<2) continue;

			if (scannable_text.includes(" " + persistence_list[j]) || scannable_text.includes(" " + word_that_triggered_sponsor_segment)) {
				still_in_ad = true;
				recent_word_to_persist = persistence_list[j]
				console.log("Still in sponsored segment due to encountering: \"" + recent_word_to_persist + "\"");
				skip_ahead(1);
				break;
			}
		}

		// sponsored segment should be over
		if (!still_in_ad) {
			consistent_failures++;

			// if two or more consistent scan intervals lack ad content, we're out of the ad
			if (consistent_failures > 1) {
				consistent_failures = 0;
				inside_sponsored_segment = false;
				console.log("Out of sponsored segment");

				// rewind to previous scan interval * 2 (so we don't overshoot actual content)
				recent_caption_words = [];
				skip_ahead(null);
				// reset back to default scanning interval
				clearInterval(scan_interval);
				scan_interval = setInterval(function() {
				    sponsor_check()
				}, SCAN_INTERVAL_SECS * 1000);
			}
		}
	}

	return true;
}

function skip_ahead(direction) {

	temp_direction_div.innerHTML = direction;

	// tell youtube video to skip ahead
	var injectedCode = "(" + function() {
		var ytplayer = document.getElementById("movie_player");
		var current_time = ytplayer.getCurrentTime();

		// write new timestamp?
		var get_persistence_happening = document.getElementById("__persistence_happening__").innerHTML;

		// pull new timestamp (@TODO redundant...)
		if (get_persistence_happening == 1)
			document.getElementById("__sponsor_ends_at__").innerHTML = current_time + parseInt(document.getElementById("__seconds_to_skip__").innerHTML);

		// at end of sponsored segment, rewind back
		var seek_time = parseInt(document.getElementById("__sponsor_ends_at__").innerHTML);

		var pulled_direction = document.getElementById("__temp_direction__").innerHTML;

		// generic fast forward/rewind
		if (pulled_direction.toString().length>0) 
			seek_time = current_time+parseInt(document.getElementById("__seconds_to_skip__").innerHTML * pulled_direction);

	   ytplayer.seekTo(seek_time);
	} + ")();";

	var script = document.createElement("script");
	script.textContent = injectedCode;
	(document.head || document.documentElement).appendChild(script);
	script.parentNode.removeChild(script);
}

function remove(arr, str) {
    var index = arr.indexOf(str);

    while (index !== -1) {
        arr.splice(index, 1);
        index = arr.indexOf(str);
    }
}
