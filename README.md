# Zauberflote: A Peer-to-Peer CDN

Zauberflote uses WebRTC and a centralized tracker system similar to the
BitTorrent protocol to enable peer-to-peer content delivery. Zauberflote can
currently be used for CSS, JS, and image assets. See
`src/fiddler/frontend.html` for an example of how Zauberflote is used.

To run Zauberflote, clone the repo and run an instance of the Go server in
`src/fiddler/main.go` on a server. You can do this by running `make &&
bin/fiddler`. Change the IP address at the top of `zauberflote.js` to match
your server's IP and port on which `main.go` is running. Then, import the two
Zauberflote files into your own HTML page as follows:

```html
<script src="peerdl.js"></script>
<script src="zauberflote.js"></script>
```

Attach the original URL of the asset as attribute "data-zf-fallback" of that
asset. Generate a SHA1 hash corresponding to that asset and set it as attribute
"data-zf-hash" of that asset. Example for a JS file is as follows:

```html
<script data-zf-fallback="{{original-URL}}" data-zf-hash="{{hash}}"></script>
```

Finally, insert a script in the head of your HTML file that calls the following
method for each P2P distributed asset, using each asset's hash and size as
parameters.

```html
<script>tr.publish('{{hash}}', {{asset_size}});</script>
```
