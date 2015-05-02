package main

import (
	"log"
	"net/http"
	"strconv"
	"sync"
	. "types"

	"crypto/rand"
	"encoding/json"
	"github.com/googollee/go-socket.io"
	"github.com/rs/cors"
	"math/big"
)

type PeerRequest struct {
	Seq  int    `json:"seq"`
	Hash string `json:"hash"`
}

type PeerReply struct {
	Hash  string   `json:"hash"`
	Peers []PeerId `json:"peers"`
}

type WebRTCRequest struct {
	Peer PeerId `json:"peer"`
	Data string `json:"data"`
}

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
			var request WebRTCRequest
			err := json.Unmarshal([]byte(hash), &request)
			if err != nil {
				log.Println("ERROR AAAH")
			}
			webRTCdat := &WebRTCRequest{Data: request.Data, Peer: id}
			peerSocket, ok := tracker.GetSocket(request.Peer)
			if !ok {
				log.Println("invalid target", request.Peer)
				return
			}
			log.Println("sending to peer for webrtc: ", webRTCdat)
			(*peerSocket).Emit("webrtc-data", webRTCdat)
		})

		so.On("peer-request", func(req string) {
			log.Println("peer-request:", req)
			var request PeerRequest
			err := json.Unmarshal([]byte(req), &request)
			if err != nil {
				log.Println("error unmarshaling peer request")
				return
			}
			peers := tracker.Peers(request.Hash)
			reply := PeerReply{request.Hash, peers}
			channel := "peer-reply-" + strconv.Itoa(request.Seq)
			so.Emit(channel, reply)
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

type Tracker interface {
	Connect(id PeerId, so *socketio.Socket)

	Disconnect(id PeerId)

	GetSocket(id PeerId) (*socketio.Socket, bool)

	Add(id PeerId, hash string)

	Peers(hash string) []PeerId
}

type tracker struct {
	infos map[PeerId]*socketio.Socket
	data  map[string]map[PeerId]Unit
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

func (tr *tracker) GetSocket(id PeerId) (*socketio.Socket, bool) {
	val, ok := tr.infos[id]
	return val, ok
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
