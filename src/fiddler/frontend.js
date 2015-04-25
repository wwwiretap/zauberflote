var socket = io.connect('http://localhost:5000');

var IS_CHROME = !!window.webkitRTCPeerConnection,
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription;

if (IS_CHROME) {
  RTCPeerConnection = webkitRTCPeerConnection;
  RTCIceCandidate = window.RTCIceCandidate;
  RTCSessionDescription = window.RTCSessionDescription;
} else {
  RTCPeerConnection = mozRTCPeerConnection;
  RTCIceCandidate = mozRTCIceCandidate;
  RTCSessionDescription = mozRTCSessionDescription;
}

function SignalingChannel(peerConnection) {
  // Setup the signaling channel here
  this.peerConnection = peerConnection;
}

SignalingChannel.prototype.send = function(message) {
  // Send messages using your favorite real-time network
  console.log("Send:");
  console.log(message);
};

var signalingChannel = new SignalingChannel();
var configuration = {
  'iceServers': [{
    'url': (IS_CHROME ? 'stun:stun.l.google.com:19302' : 'stun:23.21.150.121')
  }]
};
var pc;

// call start() to initiate

var dataChannel;

function start() {
  pc = new RTCPeerConnection(configuration);

  // send any ice candidates to the other peer
  pc.onicecandidate = function (evt) {
    if (evt.candidate)
      signalingChannel.send(JSON.stringify({
        'candidate': evt.candidate
      }));
  };

  // let the 'negotiationneeded' event trigger offer generation
  pc.onnegotiationneeded = function () {
    pc.createOffer(localDescCreated, logError);
  }

  dataChannel = pc.createDataChannel("my_label");

  dataChannel.onmessage = function (event) {
    var data = event.data;

    console.log("I got data channel message: ", data);
  };

  dataChannel.onopen = function (event) {
    dataChannel.send("Hello World!");
  };
}

function localDescCreated(desc) {
  pc.setLocalDescription(desc, function () {
    signalingChannel.send(JSON.stringify({
      'sdp': pc.localDescription
    }));
  }, logError);
}

signalingChannel.onmessage = function (evt) {
  if (!pc)
    start();

  var message = evt;
  if (message.sdp)
    pc.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
      // if we received an offer, we need to answer
      if (pc.remoteDescription.type == 'offer')
        pc.createAnswer(localDescCreated, logError);
    }, logError);
  else
    pc.addIceCandidate(new RTCIceCandidate(message.candidate));
};

function logError(error) {
  console.log('error: ' + error)
}

var o = signalingChannel.onmessage;
