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
  var item = $("[data-zauberflote=" + data.hash + "]")[0];
  if (data.peers.length ==  0) {  
    item.src = $(item).attr("data-original");
    item.className = item.className + " received";
    socket.emit("add", data.hash);
  } else {
    item.className = item.className + " waiting";
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
      console.log(event.data);
      console.log(JSON.parse(event.data));
    }
  };

  dataChannel = pc.createDataChannel("my_label");
  dataChannel.onmessage = function (event) {
    var data = event.data;
    console.log("I got data channel message: ", data);
  };
  dataChannel.onopen = function (event) {
    dataChannelSendAssets();
  };
}

function dataChannelSendAssets() {
  dataChannel.send("hello world");
  var receivedAssets = $(".zauberflote-item.received");
  for (var i = 0; i < receivedAssets.length; i++) {
    var image = receivedAssets[i];
    // create an empty canvas element
    var canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d");
    image.onload = function () {
      //Set canvas size is same as the picture
      canvas.width = image.width;
      canvas.height = image.height;
      // draw image into canvas element
      canvasContext.drawImage(image, 0, 0, image.width, image.height);
      // get canvas contents as a data URL (returns png format by default)
      var dataURL = canvas.toDataURL();
      console.log(dataURL);
      var data = {"hash": $(image).attr("data-zauberflote"),
        

      dataChannel.send({
        "hash": $(image).attr("data-zauberflote"),
        "data": dataURL.toString()
      });
    };
  }
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
  // auto p2p
  var p2pAssets = $(".zauberflote-item");
  for (var i = 0; i < p2pAssets.length; i++) {
    var hash = $(p2pAssets[i]).attr("data-zauberflote");
    console.log("emitting " + hash);
    socket.emit("peer-request",hash);
  }
});

































