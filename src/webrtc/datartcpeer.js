// var localConnection;
var remoteConnection;
// var sendChannel;
var receiveChannel;
var pcConstraint;
var dataConstraint;

var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

var servers = { iceServers: [
    {url: "stun:stun.l.google.com:19302"},
    {url: "stun:stun1.l.google.com:19302"},
    {url: "stun:stun2.l.google.com:19302"},
    {url: "stun:stun3.l.google.com:19302"},
    {url: "stun:stun4.l.google.com:19302"}
  ] };

function createConnection() {
  pcConstraint = null;
  
  remoteConnection = new PeerConnection(servers, pcConstraint);
  console.log("created remote peer connection object remoteConnection");

  remoteConnection.onicecandidate = function(event) {
    console.log("remote ice callback");
    if (event.candidate) {
      console.log("remote ice candidate: \t" + event.candidate.candidate);
      console.log("send this candidate to local peer method receiveIceCandidateFromSender(" + event.candidate + ")");
    }
  }
  remoteConnection.ondatachannel = function(event) {
    console.log("receive channel callback");
    receiveChannel = event.channel;
    receiveChannel.onmessage = function(event) {
      console.log("received message: " + event.data);
    }
    receiveChannel.onopen = function() {
      var readyState = receiveChannel.readyState;
      console.log("Receive channel state is: " + readyState);
    }
  }
}

function receiveIceCandidateFromSender(candidate) {
  candidate = new RTCIceCandidate(candidate);
  remoteConnection.addIceCandidate(candidate,
    function() {
      console.log("remote connection added ice candidate");
    },
    function() {
      console.log("remote connection failed to add ice candidate");
    }
  );
}

function setRemoteConnectionDescriptionAndCreateAnswer(desc) {
  remoteConnection.setRemoteDescription(desc);
  remoteConnection.createAnswer(function(desc) {
      remoteConnection.setLocalDescription(desc);
      console.log("answer from remoteConnection \t" + desc.sdp);
      console.log("send to local setLocalConnectionRemoteDescription(" + desc + ")");
    }, function(error) {
      console.log("failed to create session description: " + error.toString());
    }
  );
}


createConnection();   

