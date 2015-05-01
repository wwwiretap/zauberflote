

$(document).ready(function() {
  // auto p2p
  var p2pAssets = $(".zauberflote-item");
  for (var i = 0; i < p2pAssets.length; i++) {
    var item = p2pAssets[i];
    console.log(item)
    var src = $(item).attr('data-original');

    var xhr = new XMLHttpRequest();
    // CORS NEEDS TO BE ENABLED FOR THIS TO WORK!!!
    // Access-Control-Allow-Origin: *
    xhr.open('GET', src, true);
    xhr.responseType = 'blob';
    xhr.onload = function(e) {
      if (this.status == 200) {
        var blob = this.response;

        item.onload = function(e) {
          window.URL.revokeObjectURL(item.src); // Clean up after yourself.
        };
        item.src = window.URL.createObjectURL(blob);
      }
    };

    xhr.send();
  }
});

































