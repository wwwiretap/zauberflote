# Protocol Spec

Client-tracker communication over websockets.

Client tells tracker that it has a hash
"add" : "{hash}"

Client asynchronously asks tracker for peers who have a hash
"peer-request" : "{hash}"

Tracker tells client about peers who have a hash
"peer-response" : {"hash": "{hash}", "peers": ["{id}", ...]}

TODO: WebRTC signaling and relationship with peer IDs
