'use strict';

/**
 * Utilities
 */

var DEBUG = true;

function logError(error) {
  if (DEBUG) {
    console.log('error: ' + error);
  }
}

function trace(msg) {
  if (DEBUG) {
    console.log(msg);
  }
}

/**
 * Tracker Interface
 */

function Tracker(socket) {
  this.socket = socket;
  this.counter = 0;
}

Tracker.prototype.getInfo = function(hash, callback) {
  if (this.HTTP_ONLY === true) {
    callback({hash: hash, size: -1, peers: []});
    return;
  }

  var seq = ++this.counter;
  var req = {seq: seq, hash: hash};
  this.socket.emit('peer-request', JSON.stringify(req));
  this.socket.once('peer-reply-' + seq, function(data) {
    if (data.hash === hash) {
      callback(data);
    }
  });
};

Tracker.prototype.advertise = function(hash) {
  this.socket.emit('add', hash);
};

Tracker.prototype.publish = function(hash, size, addPeer) {
  if (typeof(addPeer) === 'undefined' || addPeer === null) {
    addPeer = false;
  }
  var req = {hash: hash, size: size, addPeer: addPeer};
  this.socket.emit('publish', JSON.stringify(req));
};

/**
 * Signaling Channel
 */

function SignalingChannel(socket) {
  this.socket = socket;
  this.onmessage = null; // function taking (peer, data)
  var that = this;
  // set up handlers on socket
  this.socket.on('webrtc-data', function(data) {
    if (that.onmessage !== null) {
      that.onmessage(data.peer, data.data);
    }
  });
}

SignalingChannel.prototype.send = function(peer, data) {
  var req = {peer: peer, data: data};
  this.socket.emit('webrtc-data', JSON.stringify(req));
};

/**
 * Connection Manager
 */

var IS_CHROME = !!window.webkitRTCPeerConnection;
var RTCPeerConnection;
var RTCIceCandidate;
var RTCSessionDescription;
if (IS_CHROME) {
  RTCPeerConnection = webkitRTCPeerConnection;
  RTCIceCandidate = window.RTCIceCandidate;
  RTCSessionDescription = window.RTCSessionDescription;
} else {
  RTCPeerConnection = mozRTCPeerConnection;
  RTCIceCandidate = mozRTCIceCandidate;
  RTCSessionDescription = mozRTCSessionDescription;
}

var CONFIGURATION = {
  iceServers: [
    {url: "stun:stun.l.google.com:19302"},
    {url: "stun:stun1.l.google.com:19302"},
    {url: "stun:stun2.l.google.com:19302"},
    {url: "stun:stun3.l.google.com:19302"},
    {url: "stun:stun4.l.google.com:19302"}
  ]
};

function start(manager, peerId, originator) {
  var pc = new RTCPeerConnection(CONFIGURATION);

  // send any ice candidates to other peer
  pc.onicecandidate = function(evt) {
    if (evt.candidate && originator === true) {
      var msg = {candidate: evt.candidate};
      manager.signalingChannel.send(peerId, JSON.stringify(msg));
    }
  };

  // let the 'negotiationneeded' event trigger offer generation
  pc.onnegotiationneeded = function() {
    pc.createOffer(function(desc) {
      pc.setLocalDescription(desc, function() {
        if (originator === true) {
          var msg = {sdp: pc.localDescription};
          manager.signalingChannel.send(peerId, JSON.stringify(msg));
        }
      }, logError);
    }, logError);
  };

  // message handler
  var handler = function(event) {
    if (manager.onmessage !== null) {
      manager.onmessage(peerId, event.data);
    }
  };

  // data channel creation handler
  pc.ondatachannel = function(event) {
    event.channel.onmessage = handler;
  };

  // create our data channel
  var dataChannel = pc.createDataChannel('data');
  dataChannel.onmessage = handler;

  manager.connections[peerId] = pc;
  manager.dataChannels[peerId] = dataChannel;

  return pc;
}

function ConnectionManager(signalingChannel) {
  this.signalingChannel = signalingChannel;
  this.onmessage = null; // function taking (peer, data)
  this.connections = {};
  this.dataChannels = {};
  // set up handler
  var that = this;
  this.signalingChannel.onmessage = function(peer, data) {
    var pc;
    if (!that.connections.hasOwnProperty(peer)) {
      pc = start(that, peer, false);
    } else {
      pc = that.connections[peer];
    }
    var message = JSON.parse(data);
    if (message.sdp) {
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), function() {
        // if we received an offer, we need to answer
        if (pc.remoteDescription.type === 'offer') {
          pc.createAnswer(function(desc) {
            pc.setLocalDescription(desc, function() {
              var msg = {sdp: pc.localDescription, peer: peer};
              that.signalingChannel.send(peer, JSON.stringify(msg));
            }, logError);
          }, logError);
        }
      }, logError);
    } else {
      pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
  };
}

ConnectionManager.prototype.connect = function(peer) {
  // no-op if already connected
  if (this.connections.hasOwnProperty(peer)) {
    return;
  } else {
    start(this, peer, true);
  }
};

ConnectionManager.prototype.reset = function(peer) {
  if (this.connections.hasOwnProperty(peer)) {
    var pc = this.connections[peer];
    pc.close();
    delete this.connections[peer];
    delete this.dataChannels[peer];
  }
};

ConnectionManager.prototype.send = function(peer, data) {
  this.connect(peer);
  var dataChannel = this.dataChannels[peer];
  if (typeof(dataChannel) === 'undefined' ||
      dataChannel === null ||
      dataChannel.readyState === 'closing' ||
      dataChannel.readyState === 'closed') {
    this.reset(peer);
    return;
  }
  if (dataChannel.readyState === 'open') {
    dataChannel.send(data);
  } else if (dataChannel.readyState === 'connecting') {
    // queue data
    var old = dataChannel.onopen;
    if (typeof(old) !== 'undefined' && old !== null) {
      old.queued.push(data);
    } else {
      var f = {queued: [data]};
      f.call = function(event) {
        for (var i = 0; i < this.queued.length; i++) {
          dataChannel.send(this.queued[i]);
        }
      };
      dataChannel.onopen = f;
    }
  }
};

/**
 * Download Manager
 */

function marshalBuffer(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function unmarshalBuffer(base64) {
  var binaryString =  window.atob(base64);
  var len = binaryString.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++)        {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function marshal(message) {
  // message expected to be JSONable except for the payload field
  // which this function will handle marshalling
  if (message.hasOwnProperty('payload') &&
      message.payload instanceof ArrayBuffer) {
    message.payload = marshalBuffer(message.payload);
  }
  return JSON.stringify(message);
}

function unmarshal(data) {
  var message = JSON.parse(data);
  if (message.hasOwnProperty('payload')) {
    message.payload = unmarshalBuffer(message.payload);
  }
  return message;
}

// Download object -- data representation of file chunks
function Download(downloadManager, peers, size, hash, fallbackUrl, callback) {
  this.downloadManager = downloadManager;
  this.peers = peers;
  this.downloadSize = size;
  this.hash = hash;
  this.fallbackUrl = fallbackUrl;
  this.done = callback;

  // instantiate chunk array
  this.chunks = [];
  for (var i = 0; i < this.downloadSize; i += this.downloadManager.chunkSize) {
    this.chunks.push({peer: null, lastSent: null, numTries: 0, data: null});
  }
}

// Start the download
Download.prototype.start = function() {
  var loopTickDuration = 25; // in ms
  var trackerCheckSkip = 10;
  var loopCount = 0;

  var that = this;
  var check = function() {
    var done = true; // will be set to false if any chunk not downloaded
    loopCount = loopCount + 1;
    if (loopCount % trackerCheckSkip == 0) {
      loopCount = 0;
      that.downloadManager.tracker.getInfo(that.hash, function(info) {
        that.peers = info.peers || [];
      });
    }
    // fall back to HTTP?
    if (that.peers.length == 0) {
      that.abort();
      return;
    }
    // loop through chunks
    for(var i = 0; i < that.chunks.length; i++) {
      var chunk = that.chunks[i];
      // chunk.lastSent is in milliseconds
      if (chunk.data == null) {
        if (that.timedOut(chunk.lastSent, chunk.numTries)) {
          var peer = that.choosePeer();
          var msg = {type: 'request', hash: that.hash, seq: i};
          that.downloadManager.connectionManager.send(peer, marshal(msg));
          // update chunk data
          chunk.peer = peer;
          var now = new Date();
          chunk.lastSent = now.getTime();
          chunk.numTries = chunk.numTries + 1;
        }
        done = false;
      }
    }

    if (!done) {
      setTimeout(check, loopTickDuration);
    } else {
      that.finish();
    }
  };
  check();
}

Download.prototype.timedOut = function(lastSent, numTries) {
  var base = 100; // ms
  var ceiling = 2000; // ms
  var timeout = Math.min(base * Math.pow(2, numTries), ceiling); // ms
  var now = new Date();
  if (lastSent == null || now.getTime() - lastSent > timeout) {
    return true;
  }
  return false;
}

Download.prototype.choosePeer = function() {
  return this.peers[Math.floor(Math.random() * this.peers.length)];
}

// Chunk of download obj received
Download.prototype.received = function(seq, payload) {
  this.chunks[seq].data = payload;
}

Download.prototype.finish = function() {
  var content = new ArrayBuffer(this.downloadSize);
  for (var i = 0; i < this.chunks.length; i++) {
    var chunkSize = this.downloadManager.chunkSize;
    var chunkStart = i * chunkSize;
    var currChunkSize = Math.min(chunkStart + chunkSize, this.downloadSize) - chunkStart;
    var view = new Uint8Array(content, chunkStart, currChunkSize);
    view.set(new Uint8Array(this.chunks[i].data));
  }
  // validate hash
  if (this.downloadManager.hashfn(content) !== this.hash) {
    trace('hash mismatch for ' + this.hash + ', falling back');
    this.abort();
  } else {
    trace('hash ok for ' + this.hash);
    this.downloadManager.finishDownload(this.hash, content, null, this.done);
  }
}

Download.prototype.abort = function() {
  trace('aborted ' + this.hash);
  var that = this;
  if (this.fallbackUrl !== null) {
    xhrGet(this.fallbackUrl, function(data, err) {
      that.downloadManager.finishDownload(that.hash, data, err, that.done);
    });
  } else {
    var err = new Error('P2P download unavailable, no fallback provided');
    that.downloadManager.finishDownload(that.hash, null, err, that.done);
  }
};

function DownloadManager(tracker, connectionManager, hashfn) {
  var that = this;
  this.tracker = tracker;
  this.connectionManager = connectionManager;
  this.hashfn = hashfn;
  this.downloaded = {};
  this.chunkSize = 25 * 1024; // chunk size in bytes
  // the following implementation detail will probably change in order to
  // improve performance, but the DownloadManager API should stay the same
  this.pending = {}; // map from hash to Downloads
  // handle request or response appropriately
  this.connectionManager.onmessage = function(peer, data) {
    var msg = unmarshal(data);
    if (msg.type === 'request') {
      var hash = msg.hash;
      if (that.downloaded.hasOwnProperty(hash)) {
        var chunkStart = msg.seq * that.chunkSize;
        var currChunkSize = Math.min(chunkStart + that.chunkSize, that.downloaded[hash].byteLength);
        var chunkData = that.downloaded[hash].slice(chunkStart, currChunkSize);
        var resp = {type: 'data', hash: hash, payload: chunkData, seq: msg.seq};
        that.connectionManager.send(peer, marshal(resp));
      }
    } else if (msg.type === 'data') {
      // handle data, call callback if necessary
      var hash = msg.hash;
      if (that.pending.hasOwnProperty(hash)) {
        var downloadObject = that.pending[hash];
        downloadObject.received(msg.seq, msg.payload);
      }
    }
  };
}

DownloadManager.prototype.finishDownload = function(hash, content, error, callback) {
  if (typeof(error) === 'undefined' || error === null) {
    this.downloaded[hash] = content;
    delete this.pending[hash];
    this.tracker.advertise(hash);
    callback(this.downloaded[hash]);
  } else {
    callback(null, error);
  }
}

DownloadManager.prototype.publish = function(hash, data, addPeer) {
  if (this.downloaded.hasOwnProperty(hash)) {
    return;
  }
  this.downloaded[hash] = data;
  this.tracker.publish(hash, data.byteLength, addPeer);
};

// callback takes (ArrayBuffer, Error)
function xhrGet(url, callback) {
  // CORS needs to be enabled for this to work
  // the server needs to send the Access-Control-Allow-Origin: *
  // header
  var xhr = new XMLHttpRequest();
  // hack to avoid using cached data
  xhr.open('GET', url + '?' + Math.random(), true);
  xhr.responseType = 'arraybuffer';
  xhr.onerror = function(e) {
    callback(null, e);
  };
  xhr.onload = function(e) {
    if (this.status == 200) {
      var buffer = this.response;
      callback(buffer, null);
    } else {
      callback(null, new Error('XHR returned ' + this.status));
    }
  };
  xhr.send();
}

// callback takes (ArrayBuffer, Error)
DownloadManager.prototype.download = function(hash, fallbackUrl, callback) {
  var that = this;
  if (this.downloaded.hasOwnProperty(hash)) {
    callback(this.downloaded[hash]);
    return;
  } else if (this.pending.hasOwnProperty(hash)) {
    // in progress, no need to do anything
    return;
  }
  this.tracker.getInfo(hash, function(info) {
    var download = new Download(that, info.peers, info.size, hash, fallbackUrl, callback);
    that.pending[hash] = download;
    download.start();
  });
};
