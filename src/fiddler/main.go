package main

import (
	"log"
	"net/http"
	"sync"
	. "types"

	"github.com/googollee/go-socket.io"
	"github.com/rs/cors"
  "encoding/json"
  "crypto/rand"
  "math/big"
)

func main() {
	server, err := socketio.NewServer(nil)
	never(err)

	tracker := CreateTracker()

	server.On("connection", func(so socketio.Socket) {
		log.Println("on connection")

		id := PeerId(so.Id())
		tracker.Connect(id, &so)

		so.On("add", func(hash string) {
			log.Println("add:", hash)
			tracker.Add(id, hash)
		})

    so.On("webrtc-data", func(hash string) {
      log.Println("webrtc-data:", hash)
      byt := []byte(hash)
      var dat map[string]interface{}
      if err := json.Unmarshal(byt, &dat); err != nil {
        panic(err)
      }
      log.Println(dat)
      if rid, ok := dat["req_id"]; ok {
        // this is an answer to a previous connection request
        pid := tracker.GetRequest(ReqId(rid.(int64)))
        webRTCdat := tracker.PeerReply(dat)
        log.Println(webRTCdat)
        peerSocket := tracker.GetSocket(PeerId(pid))
        log.Println(peerSocket)
        (*peerSocket).Emit("webrtc-data", webRTCdat)
      } else {
        // data needs to be sent to all peers with hash
        peers := tracker.Peers(dat["hash"].(string))
        for _, peer := range peers {
          reqId := tracker.StoreRequest(peer)
          webRTCdat := tracker.PeerRequest(dat, reqId)
          log.Println(webRTCdat)
          peerSocket := tracker.GetSocket(PeerId(peer))
          log.Println(peerSocket)
          (*peerSocket).Emit("webrtc-data", webRTCdat)
        }
      }
    })

		so.On("disconnection", func() {
			log.Println("disconnection")
			tracker.Disconnect(id)
		})
	})

	server.On("error", func(so socketio.Socket, err error) {
		log.Println("error:", err)
	})

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowCredentials: true,
	})

	http.Handle("/", c.Handler(server))
	log.Println("Serving at :5000...")
	log.Fatalln(http.ListenAndServe(":5000", nil))
}

func never(err error) {
	if err != nil {
		log.Fatalln(err)
	}
}

type PeerId string
type ReqId int64

type Tracker interface {
	Connect(id PeerId, so *socketio.Socket)

	Disconnect(id PeerId)

  GetSocket(id PeerId) *socketio.Socket

	Add(id PeerId, hash string)

	Peers(hash string) []PeerId

  StoreRequest(id PeerId) ReqId

  PeerRequest(dat map[string]interface{}, id ReqId) string

  GetRequest(id ReqId) PeerId

  PeerReply(dat map[string]interface{}) string
}

type tracker struct {
	infos map[PeerId]*socketio.Socket
	data  map[string]map[PeerId]Unit
  webrtcRequests map[ReqId]PeerId
	mu    sync.Mutex
}

func nrand() int64 {
  max := big.NewInt(int64(1) << 62)
  bigx, _ := rand.Int(rand.Reader, max)
  x := bigx.Int64()
  return x
}

func CreateTracker() Tracker {
	tr := &tracker{}
	tr.infos = make(map[PeerId]*socketio.Socket)
	tr.data = make(map[string]map[PeerId]Unit)
  tr.webrtcRequests = make(map[ReqId]PeerId)
	return tr
}

func (tr *tracker) Connect(id PeerId, so *socketio.Socket) {
	tr.mu.Lock()
	defer tr.mu.Unlock()
	tr.infos[id] = so
}

func (tr *tracker) Disconnect(id PeerId) {
	tr.mu.Lock()
	defer tr.mu.Unlock()
	delete(tr.infos, id)
	for _, v := range tr.data {
		delete(v, id)
	}
}

func (tr *tracker) GetSocket(id PeerId) *socketio.Socket {
  return tr.infos[id]
}

func (tr *tracker) Add(id PeerId, hash string) {
	tr.mu.Lock()
	defer tr.mu.Unlock()
	if v, ok := tr.data[hash]; ok {
		v[id] = Unit{}
	} else {
		tr.data[hash] = map[PeerId]Unit{id: Unit{}}
	}
}

func (tr *tracker) Peers(hash string) []PeerId {
	tr.mu.Lock()
	defer tr.mu.Unlock()
	peers := make([]PeerId, 0)
	if v, ok := tr.data[hash]; ok {
		for k, _ := range v {
			peers = append(peers, k)
		}
	}
	return peers
}

func (tr *tracker) StoreRequest(id PeerId) ReqId {
  tr.mu.Lock()
  defer tr.mu.Unlock()
  reqId := ReqId(nrand())
  tr.webrtcRequests[reqId] = id
  return reqId
}

func (tr *tracker) PeerRequest(dat map[string]interface{}, id ReqId) string {
  peerDat := make(map[string]interface{})
  for k, v := range dat {
    peerDat[k] = v
  }
  peerDat["req_id"] = id
  request, _ := json.Marshal(peerDat)
  return string(request)
}

func (tr *tracker) GetRequest(id ReqId) PeerId {
  tr.mu.Lock()
  defer tr.mu.Unlock()
  peerId := tr.webrtcRequests[id]
  delete(tr.webrtcRequests, id)  // conserve memory
  return peerId
}

func (tr *tracker) PeerReply(dat map[string]interface{}) string {
  peerDat := make(map[string]interface{})
  for k, v := range dat {
    if k != "peer_id" {
      peerDat[k] = v
    }
  }
  request, _ := json.Marshal(peerDat)
  return string(request)
}
