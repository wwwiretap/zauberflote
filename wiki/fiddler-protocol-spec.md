# Protocol Spec

Client-tracker communication over websockets.

Client tells tracker that it has a hash
"add" : "{hash}"

Client asks which peers have a hash
"peer-request" : {"hash"}

Tracker tells client about peers who have a hash
"peer-response" : {"hash": "{hash}", "peers": ["{id}", ...]}

WebRTC signaling and relationship with peer IDs
"webrtc-data" : {"sdp": ..., "hash": ...}
"webrtc-data" : {"candidate": ..., "hash: ...}


WebRTC data transfer protocol:
Peer A                   |     Server      |     Peer B
                         |      Add <---------advertise hash(X)
ask for hash(X)          |                 |
"peer-request"{hash}-------->              |
                    <--------peers(hash)   |
"webrtc-data"{cand,peer}---->socket(peer)----->o(candidate)
"webrtc-data"{offer,hash}--->socket(peer)----->o(offer, peer)
                         |                 |  generate answer
           o(answer)<--------socket(peer)<----answer, peer
establish connection<------------------------>establish connection
ask for hash(X)------------------------------>
               <------------------------------content


======================================================

# Frontend Spec
For all items streamed p2p via zauberflote:
1) Set item class to be "zauberflote-item"
2) Set item data-zauberflote attribute to item hash
