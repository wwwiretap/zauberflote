var localConnection;
var remoteConnection;
var sendChannel;
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
  
  // global localConnection
  localConnection = new PeerConnection(servers, pcConstraint);
  // window.localConnection = localConnection;
  console.log("new peer connection object localConnection");
  
  sendChannel = localConnection.createDataChannel("sendDataChannel", dataConstraint);
  console.log("created send data channel");

  localConnection.onicecandidate = function(event) {
    console.log("local ice callback");
    if (event.candidate) {
      remoteConnection.addIceCandidate(event.candidate,
        function() {
          console.log("remote connection added ice candidate");
        },
        function() {
          console.log("remote connection failed to add ice candidate");
        }
      );
      console.log("local ice candidate: \t" + event.candidate.candidate);
    }
  }

  sendChannel.onopen = function() {
    var readyState = sendChannel.readyState;
    console.log("send channel state is: " + readyState);
  }
  sendChannel.onclose = function() {
    var readyState = sendChannel.readyState;
    console.log("send channel state is: " + readyState);
  }
  
  // global remoteConnection
  remoteConnection = new PeerConnection(servers, pcConstraint);
  // window.remoteConnection = remoteConnection;
  console.log("created remote peer connection object remoteConnection");

  remoteConnection.onicecandidate = function(event) {
    console.log("remote ice callback");
    if (event.candidate) {
      localConnection.addIceCandidate(event.candidate,
        function() {
          console.log("local connection added ice candidate");
        },
        function() {
          console.log("local connection failed to add ice candidate");
        }
      );
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
  
  localConnection.createOffer(function(desc) {
      localConnection.setLocalDescription(desc);
      console.log("offer from localConnection \t" + desc.sdp);
      remoteConnection.setRemoteDescription(desc);
      remoteConnection.createAnswer(function(desc) {
          remoteConnection.setLocalDescription(desc);
          console.log("answer from remoteConnection \t" + desc.sdp);
          localConnection.setRemoteDescription(desc);
        }, function(error) {
          console.log("failed to create session description: " + error.toString());
        }
      );
    }, function(error) {
      console.log("failed to create session description: " + error.toString());
    }
  );
}

createConnection();   

