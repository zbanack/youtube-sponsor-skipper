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

	chrome.storage.sync.get("secs", function(items) {
	    if (!chrome.runtime.error)
	    	seconds_to_skip_div.innerHTML = items["secs"];
	});

	document.body.appendChild(seconds_to_skip_div); 

	// call parser every n second
	window.setInterval(function() {
	    sponsor_check()
	}, SCAN_INTERVAL_SECS * 1000);
}

// parse and clean captions
function scrape_captions() {
	// locate YT caption divs on page
	matches = document.getElementsByClassName("ytp-caption-segment");

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
		}
	}

	// limit size of caption collection
	while(recent_caption_words.length>CAPTION_CACHE_SIZE)
		recent_caption_words.shift();

	scannable_text = recent_caption_words.join(" ");
}

// checks the capations for sponsors
function sponsor_check() {

	scrape_captions();

	// not inside any sponsored content at the moment
	if (!inside_sponsored_segment) {

		// encountered some form of the word "sponsor"
		if (scannable_text.includes("sponsor")) {

			console.log(trigger_list);

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
					skip_ahead();

					// speed up scanning interval
					window.setInterval(function() {
					    sponsor_check()
					}, 250);
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

			if (scannable_text.includes(" " + persistence_list[j]) || scannable_text.includes(word_that_triggered_sponsor_segment)) {
				still_in_ad = true;
				console.log("Still in sponsored segment due to encountering: \"" + persistence_list[j] + "\"");
				skip_ahead();
				break;
			}
		}

		// sponsored segment should be over
		if (!still_in_ad) {
			inside_sponsored_segment = false;
			console.log("Out of sponsored segment");

			// reset back to default scanning interval
			window.setInterval(function() {
			    sponsor_check()
			}, SCAN_INTERVAL_SECS * 1000);
		}
	}
}

function skip_ahead() {
	// tell youtube video to skip ahead
	var injectedCode = "(" + function() {
		var ytplayer = document.getElementById("movie_player");
		var current_time = ytplayer.getCurrentTime();
	   ytplayer.seekTo(current_time+parseInt(document.getElementById("__seconds_to_skip__").innerHTML));
	} + ")();";

	var script = document.createElement("script");
	script.textContent = injectedCode;
	(document.head || document.documentElement).appendChild(script);
	script.parentNode.removeChild(script);	
}