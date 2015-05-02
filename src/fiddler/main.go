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

type InfoRequest struct {
	Seq  int    `json:"seq"`
	Hash string `json:"hash"`
}

type PublishRequest struct {
	Hash string `json:"hash"`
	Size int `json:"size"`
	AddPeer bool `json:"addPeer"`
}

type InfoReply struct {
	Hash  string   `json:"hash"`
	Peers []PeerId `json:"peers"`
	Size int `json:"size"`
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
			ok := tracker.Add(id, hash)
			if !ok {
				log.Println("add error, untracked?");
			}
		})

		so.On("publish", func(data string) {
			// XXX for debugging only
			// For security, there shouldn't be a way for people to
			// publish stuff through the client socket interface.
			// Stuff to be tracked should be added through a config
			// file or some external authenticated interface.
			log.Println("publish:", data)
			var request PublishRequest
			err := json.Unmarshal([]byte(data), &request)
			if err != nil {
				log.Println("unmarshalling error")
				return
			}
			ok := tracker.Publish(request.Hash, request.Size)
			if !ok {
				log.Println("error publishing, duplicate?")
			}
			if request.AddPeer {
				tracker.Add(PeerId(so.Id()), request.Hash)
			}
		})

		so.On("webrtc-data", func(data string) {
			log.Println("webrtc-data:", data)
			var request WebRTCRequest
			err := json.Unmarshal([]byte(data), &request)
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
			var request InfoRequest
			err := json.Unmarshal([]byte(req), &request)
			if err != nil {
				log.Println("error unmarshaling peer request")
				return
			}
			peers := tracker.Peers(request.Hash)
			size := tracker.Size(request.Hash)
			reply := InfoReply{request.Hash, peers, size}
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

	Publish(hash string, size int) bool

	Add(id PeerId, hash string) bool

	Peers(hash string) []PeerId

	Size(hash string) int
}

type tracker struct {
	infos map[PeerId]*socketio.Socket
	data  map[string]map[PeerId]Unit
	sizes map[string]int
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
	tr.sizes = make(map[string]int)
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

func (tr *tracker) Add(id PeerId, hash string) bool {
	tr.mu.Lock()
	defer tr.mu.Unlock()
	if _, ok := tr.sizes[hash]; !ok {
		return false
	}
	if v, ok := tr.data[hash]; ok {
		v[id] = Unit{}
	} else {
		tr.data[hash] = map[PeerId]Unit{id: Unit{}}
	}
	return true
}

func (tr *tracker) Publish(hash string, size int) bool {
	tr.mu.Lock()
	defer tr.mu.Unlock()
	if _, ok := tr.sizes[hash]; ok {
		// already published
		return false
	}
	tr.sizes[hash] = size
	return true
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

func (tr *tracker) Size(hash string) int {
	tr.mu.Lock()
	defer tr.mu.Unlock()
	return tr.sizes[hash]
}
