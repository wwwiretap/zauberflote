'use strict';

/**
 * Utilities
 */

var DEBUG = false;

function logError(error) {
  if (DEBUG) {
    console.log('error: ' + error);
  }
}

/**
 * Socket
 */

var skt = io("http://localhost:5000");

/**
 * Tracker Interface
 */

function Tracker(socket) {
  this.socket = socket;
  this.counter = 0;
}

Tracker.prototype.getPeersForHash = function(hash, callback) {
  var seq = ++this.counter;
  var req = {seq: seq, hash: hash};
  this.socket.emit('peer-request', JSON.stringify(req));
  this.socket.once('peer-reply-' + seq, function(data) {
    if (data.hash === hash) {
      callback(data.peers);
    }
  });
};

Tracker.prototype.addHash = function(hash) {
  this.socket.emit('add', hash);
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
  if (typeof dataChannel === 'undefined' ||
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
    dataChannel.onopen = function(event) {
      dataChannel.send(data);
      if (typeof old !== 'undefined' && old !== null) {
        old(event);
      }
    };
  }
};

/**
 * Testing code
 *
 * This should be removed in a real build
 */

var tracker = new Tracker(skt);
tracker.getPeersForHash('magic', function(peers) {
  console.log(peers);
});
tracker.addHash('magic');
tracker.getPeersForHash('magic', function(peers) {
  console.log(peers);
});

var sc = new SignalingChannel(skt);

var cm = new ConnectionManager(sc);

cm.onmessage = function(peer, data) {
  console.log('recv from: ' + peer + ' data: ' + data);
  if (data === 'ping') {
    cm.send(peer, 'pong');
  }
};
