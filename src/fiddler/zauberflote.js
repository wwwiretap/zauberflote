/**
 * Setup
 */

var skt = io("http://localhost:5000");
var tr = new Tracker(skt);
var sc = new SignalingChannel(skt);
var cm = new ConnectionManager(sc);
var dm = new DownloadManager(tr, cm);

/**
 * Testing code
 */

var ab = new ArrayBuffer(4);
var v = new Uint8Array(ab);
v[0] = 1; v[1] = 3; v[2] = 3; v[3] = 7;
var msg = {type: 'data', start: 1337, payload: ab};

function pub() {
  dm.publish('test', ab);
}

function get() {
  dm.download('test', null, function(data, err) {
    if (err) {
      console.log('error');
      console.log(err);
    } else {
      console.log('got data!');
      var v = new Uint8Array(data);
      console.log(v);
    }
  });
}
