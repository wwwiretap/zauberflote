// -------------------------------------------------
// WEBSOCKETS
// -------------------------------------------------
var socket = io("http://localhost:5000");
var peers = [];
socket.on("connect", function(){
  console.log("connected socket!");
});
socket.on("peer-reply", function(data) {
  peers = data.peers;
  console.log(data.peers);
  if (data.peers.length ==  0) {  
    var item = $("[data-zauberflote=" + data.hash + "]")[0];
    item.src = $(item).attr("data-original");
    socket.emit("add", data.hash);
  } else {
    start();
  }
});
socket.on("webrtc-data", function(data){
  signalingChannel.onmessage(data);
});
socket.on("disconnect", function(){
  console.log("disconnected socket");
});




// ------------------------------------------------
// WEBRTC
// ------------------------------------------------


// CONFIGS
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
var configuration = {
  iceServers: [
    {url: "stun:stun.l.google.com:19302"},
    {url: "stun:stun1.l.google.com:19302"},
    {url: "stun:stun2.l.google.com:19302"},
    {url: "stun:stun3.l.google.com:19302"},
    {url: "stun:stun4.l.google.com:19302"}
  ]
};
var pc;
var dataChannel;


// SIGNALING CHANNEL
function SignalingChannel(peerConnection) {
  // Setup the signaling channel here
  this.peerConnection = peerConnection;
}
SignalingChannel.prototype.send = function(peer, message) {
  // Send messages using your favorite real-time network
  console.log("Send:");
  console.log(message);
  // right now just get the first peer
  var data = {"peer_id": peer, "data": message};
  socket.emit("webrtc-data", JSON.stringify(data));
};
var signalingChannel = new SignalingChannel();
signalingChannel.onmessage = function (evt) {
  if (!pc)
    start();

  var message = JSON.parse(evt.data);
  if (message.sdp)
    pc.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
      // if we received an offer, we need to answer
      if (pc.remoteDescription.type == 'offer')
        pc.createAnswer(localAnswerHandler(evt.peer_id), logError);
    }, logError);
  else
    pc.addIceCandidate(new RTCIceCandidate(message.candidate));
};


// INITIATE CONNECTION
function start() {

  pc = new RTCPeerConnection(configuration);
  // send any ice candidates to the other peer
  pc.onicecandidate = function (evt) {
    if (evt.candidate && peers.length > 0)
      // right now just send to first peer
      signalingChannel.send(peers[0], JSON.stringify({
        'candidate': evt.candidate,
      }));
  };
  // let the 'negotiationneeded' event trigger offer generation
  pc.onnegotiationneeded = function () {
    pc.createOffer(localOfferCreated, logError);
  }
  pc.ondatachannel = function(ev) {
    console.log(ev);
    ev.channel.onmessage = function(event) {
      console.log('got event in channel');
      console.log(event);
    }
  };

  dataChannel = pc.createDataChannel("my_label");
  dataChannel.onmessage = function (event) {
    var data = event.data;
    console.log("I got data channel message: ", data);
  };
  dataChannel.onopen = function (event) {
    dataChannel.send("Hello World!");
  };
}

function localOfferCreated(desc) {
  pc.setLocalDescription(desc, function () {
    if (peers.length > 0) {
      signalingChannel.send(peers[0], JSON.stringify({
        'sdp': pc.localDescription,
      }));
    }
  }, logError);
}

function localAnswerHandler(peerId) {
  return function(desc) {
    pc.setLocalDescription(desc, function () {
      signalingChannel.send(peerId, JSON.stringify({
        'sdp': pc.localDescription,
        'peer_id': peerId
      }));
    }, logError);
  };
}

function logError(error) {
  console.log('error: ' + error)
}

var o = signalingChannel.onmessage;


// -------------------------------------------------
// FRONTEND DOC ELEMENTS
// -------------------------------------------------

$(document).ready(function() {
  var adButton = $(document.getElementById("advertise-button"));
  var askButton = $(document.getElementById("ask-button"));
  var contentInput = $(document.getElementById("content-input"));
  var contentOutput = $(document.getElementById("content-output"));
  var hashInput = $(document.getElementById("hash-input"));

  adButton.on("click", function() {
    var content = contentInput.val();
    var hash = Sha256.hash(content);
    socket.emit("add",hash);
    console.log(hash);
  });

  askButton.on("click", function() {
    var hash = hashInput.val();
    socket.emit("peer-request", hash);
  });


  // auto p2p
  var p2pAssets = $(".zauberflote-item");
  for (var i = 0; i < p2pAssets.length; i++) {
    var hash = $(p2pAssets[i]).attr("data-zauberflote");
    console.log("emitting " + hash);
    socket.emit("peer-request",hash);
  }
});

































