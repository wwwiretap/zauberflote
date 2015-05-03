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
  var p2pAssets = $('.zf-item');
  for (var i = 0; i < p2pAssets.length; i++) {
    var item = p2pAssets[i];
    var hash = $(item).attr('data-zf-hash');
    var fallback = $(item).attr('data-zf-fallback');
    dm.download(hash, fallback, function(data, err) {
      // XXX this only works for images

      // perhaps we should store the content type in the tracker as well,
      // instead of just setting it to 'application/octet-stream' and letting
      // the browser deal with it
      var blob = new Blob([data], {type: 'application/octet-stream'});
      item.onload = function(e) {
        window.URL.revokeObjectURL(item.src); // cleanup
      };
      item.src = window.URL.createObjectURL(blob);
    });
  }
});
