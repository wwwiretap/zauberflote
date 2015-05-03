"use strict";
/**
 * Setup
 */

var skt = io('http://localhost:5000');
var tr = new Tracker(skt);
var sc = new SignalingChannel(skt);
var cm = new ConnectionManager(sc);
var dm = new DownloadManager(tr, cm);

/**
 * Automatic p2p download
 */

$(document).ready(function() {
  var p2pAssets = $('[data-zf-hash]');
  for (var i = 0; i < p2pAssets.length; i++) {
    var item = p2pAssets[i];
    var hash = $(item).attr('data-zf-hash');
    var fallback = $(item).attr('data-zf-fallback');
    (function(item) {
      dm.download(hash, fallback, function(data, err) {
        // perhaps we should store the content type in the tracker as well,
        // instead of just setting it to 'application/octet-stream' and letting
        // the browser deal with it
        var blob;

        switch(item.tagName) {
          case 'IMG': // we could just delete this and use the default handler
            console.log("downloading img");
            blob = new Blob([data], {type: 'application/octet-stream'});
            item.src = window.URL.createObjectURL(blob);
            break;
          case 'SCRIPT':
            console.log("downloading script");
            blob = new Blob([data], {type: 'text/javascript'});
            item.src = window.URL.createObjectURL(blob);
            break;
          case 'LINK':
            console.log("downloading css");
            blob = new Blob([data], {type: 'text/css'});
            item.rel = "stylesheet";
            item.href = window.URL.createObjectURL(blob);
            break;
          default:
            blob = new Blob([data], {type: 'application/octet-stream'});
            item.src = window.URL.createObjectURL(blob);
        }
      });
    }(item));
  }
});
