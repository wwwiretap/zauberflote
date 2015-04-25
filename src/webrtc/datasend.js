var pc;
var myChannel;
var yourChannel;

// input your IP address

// I know my IP

// on document load
// open connection with your IP via STUN server
// transfer set data


var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
offerConstraints = {};
errorHandler = function(err) {
  console.error(err);
}

function createConnection() {
  // WebRTC configs
  var configuration = {
    iceServers: [
      {url: "stun:stun.l.google.com:19302"},
      {url: "stun:stun1.l.google.com:19302"},
      {url: "stun:stun2.l.google.com:19302"},
      {url: "stun:stun3.l.google.com:19302"},
      {url: "stun:stun4.l.google.com:19302"}
    ]
  };
  var options = {
    optional: [{
      RtpDataChannels: true
    }]
  }
  
  pc = new PeerConnection(configuration, options);
  console.log('Created remote peer connection object pc');

  pc.onicecandidate = getRemoteIceCandidate;

  // channel configs
  channelOptions = {};
  channelName = "senderChannel";
  myChannel = pc.createDataChannel(channelName, channelOptions);
  myChannel.onerror = channelError;
  myChannel.onmessage = channelMessage;
  myChannel.onclose = channelClosed;
  
  pc.ondatachannel = onOtherChannel;

  pc.createOffer(createRemoteOffer, errorHandler, offerConstraints);
}

function onOtherChannel(e) {
  yourChannel = e.channel;
  yourChannel.onmessage = channelMessage;
  yourChannel.onerror = channelError;
  yourchannel.onclose = channelClosed;
}
  
function channelError(err) {
  console.error("Channel Error:",err);
}

function channelMessage(e) {
  console.log("Got message: ", e.data);
}

function channelClosed() {
  console.log("channel closed");
}

function createRemoteOffer(offer) {
  pc.setLocalDescription(offer);
  send("offer", JSON.stringify(offer));
}

function getRemoteIceCandidate(event) {
  console.log('remote ice callback');
  if (event.candidate) {
    // send over ice candidate
    send("icecandidate", JSON.stringify(event.candidate));
  }
}

function send(descriptor, item) {
  console.log(descriptor + "\t" + item);
}

function receiveRemoteOffer(offer) {
  offer = new SessionDescription(JSON.parse(offer));
  pc.setRemoteDescription(offer);
  pc.createAnswer(function(answer) {
    pc.setLocalDescription(answer);
    send("answer", JSON.stringify(answer));
  }, errorHandler, offerConstraints);
}


createConnection();


// function gotReceiveChannel(event) {
//   console.log('Receive Channel Callback');
//   receiveChannel = event.channel;
//   receiveChannel.onmessage = handleMessage;
//   receiveChannel.onopen = handleReceiveChannelStateChange;
//   receiveChannel.onclose = handleReceiveChannelStateChange;
// }
// 
// function gotRemoteDescription(desc) {
//   pc.setLocalDescription(desc);
//   console.log('Answer from pc \n' + desc.sdp);
//   localPeerConnection.setRemoteDescription(desc);
// }
// 
// function gotLocalDescription(desc) {
//   localPeerConnection.setLocalDescription(desc);
//   console.log('Offer from localPeerConnection \n' + desc.sdp);
//   pc.setRemoteDescription(desc);
//   pc.createAnswer(gotRemoteDescription);
// }




// function sendData() {
//   var data = dataChannelSend.value;
//   sendChannel.send(data);
//   console.log('Sent data: ' + data);
// }
// 
// function closeDataChannels() {
//   console.log('Closing data channels');
//   sendChannel.close();
//   console.log('Closed data channel with label: ' + sendChannel.label);
//   receiveChannel.close();
//   console.log('Closed data channel with label: ' + receiveChannel.label);
//   localPeerConnection.close();
//   pc.close();
//   localPeerConnection = null;
//   pc = null;
//   console.log('Closed peer connections');
//   startButton.disabled = false;
//   sendButton.disabled = true;
//   closeButton.disabled = true;
//   dataChannelSend.value = '';
//   dataChannelReceive.value = '';
//   dataChannelSend.disabled = true;
//   dataChannelSend.placeholder =
//     'Press Start, enter some text, then press Send.';
// }
// 
// function gotLocalCandidate(event) {
//   console.log('local ice callback');
//   if (event.candidate) {
//     pc.addIceCandidate(event.candidate);
//     console.log('Local ICE candidate: \n' + event.candidate.candidate);
//   }
// }
// 
// 
// function handleMessage(event) {
//   console.log('Received message: ' + event.data);
//   dataChannelReceive.value = event.data;
// }
// 
// function handleSendChannelStateChange() {
//   var readyState = sendChannel.readyState;
//   console.log('Send channel state is: ' + readyState);
//   if (readyState === 'open') {
//     dataChannelSend.disabled = false;
//     dataChannelSend.focus();
//     dataChannelSend.placeholder = '';
//     sendButton.disabled = false;
//     closeButton.disabled = false;
//   } else {
//     dataChannelSend.disabled = true;
//     sendButton.disabled = true;
//     closeButton.disabled = true;
//   }
// }
// 
// function handleReceiveChannelStateChange() {
//   var readyState = receiveChannel.readyState;
//   console.log('Receive channel state is: ' + readyState);
// }
// 




//   localPeerConnection = window.localPeerConnection =
//     new webkitRTCPeerConnection(servers, {
//       optional: [{
//         RtpDataChannels: true
//       }]
//     });
//   console.log("created local peer connection " + localPeerConnection);
// 
//   try {
//     // Reliable Data Channels not yet supported in Chrome
//     sendChannel = localPeerConnection.createDataChannel('sendDataChannel', {
//       reliable: false
//     });
//     console.log("created data channel");
//   } catch (e) {
//     console.log('createDataChannel() failed with exception: ' + e.message);
//   }
//   localPeerConnection.onicecandidate = gotLocalCandidate;
//   sendChannel.onopen = handleSendChannelStateChange;
//   sendChannel.onclose = handleSendChannelStateChange;


