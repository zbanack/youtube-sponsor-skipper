// defaults
const DEFAULT_TRIGGERS = "dash lane, dashlane, nord, squarespace, square space, skill share, skillshare, audible";
const DEFAULT_PERPETUATES = "vpn, password, manager, protect, privacy, shopping, data, breach, code, referral, link, description";
const DEFAULT_SKIP_INTERVAL = 2;

// load text
window.onload = function() {

  // load trigger list
  chrome.storage.sync.get("trigger_list", function(items) {
    if (!chrome.runtime.error)
      document.getElementById("trigger-list").value = items.trigger_list || DEFAULT_TRIGGERS;
  });

  // load persistence list
  chrome.storage.sync.get("persistence_list", function(items) {
    if (!chrome.runtime.error)
      document.getElementById("persistence-list").value = items.persistence_list || DEFAULT_PERPETUATES;
  });

  // load skip interval
  chrome.storage.sync.get("secs", function(items) {
    if (!chrome.runtime.error)
      document.getElementById("secs").value = items.secs || DEFAULT_SKIP_INTERVAL;
  });
}

// save text
document.getElementById("set").onclick = function() {

  // save trigger words
  var t = document.getElementById("trigger-list").value;
  chrome.storage.sync.set({ "trigger_list" : t }, function() {});

  // save persistence words
  var p = document.getElementById("persistence-list").value;
  chrome.storage.sync.set({ "persistence_list" : p }, function() {});

  // save seconds
  var s = document.getElementById("secs").value;
  s = parseInt(s.replace(/[^0-9]/g,""));
  s = Math.min(Math.max(1, s), 120);
  chrome.storage.sync.set({ "secs" : s }, function() {});

  window.close();
}

// open links
document.addEventListener("DOMContentLoaded", function () {
    var links = document.getElementsByTagName("a");
    for (var i = 0; i < links.length; i++) {
        (function () {
            var ln = links[i];
            var location = ln.href;
            ln.onclick = function () {
                chrome.tabs.create({active: true, url: location});
            };
        })();
    }
});