# Protocol Spec

Client-tracker communication over websockets.

Client tells tracker that it has a hash
"add" : "{hash}"

Tracker tells client about peers who have a hash
"peer-response" : {"hash": "{hash}", "peers": ["{id}", ...]}

WebRTC signaling and relationship with peer IDs
"webrtc-data" : {"sdp": ..., "hash": ...}
"webrtc-data" : {"candidate": ..., "hash: ...}


WebRTC data transfer protocol:
Peer A                   |     Server      |     Peer B
                         |      Add <---------advertise hash(X)
ask for hash(X)          |                 |
"webrtc-data"{cand,hash}---->peers(hash)----->o(candidate)
"webrtc-data"{offer,hash}--->              |
                         | generate req_id |
                         | to peers(hash)---->o(offer, req_id)
                         |                 |  generate answer
           o(answer)<------getsock(req_id)<---answer, req_id
establish connection<------------------------>establish connection
ask for hash(X)------------------------------>
               <------------------------------content
