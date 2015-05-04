# Zauberfl&ouml;te: A Peer-to-Peer CDN

Zauberfl&ouml;te uses WebRTC and a central tracker system modeled off of the BitTorrent protocol to deliver content between peers. Can be used for CSS, JS, image, and video assets. See src/fiddler/frontend.html for an example of how Zauberfl&ouml;te is used.

To run Zauberfl&ouml;te, clone the repo and run an instance of the Go server in src/fiddler/main.go on a server. Change the IP address at the top of zauberflote.js to match your server's IP and port on which main.go is running. Then, import the two Zauberfl&oumlte files into your own HTML page as follows:

<pre><code><script src="peerdl.js"></script>
<script src="zauberflote.js"></script>
</pre></code>

Attach the original URL of the asset as attribute "data-zf-fallback" of that asset. Generate a SHA256 hash corresponding to that asset and set it as attribute "data-zf-hash" of that asset. Example for a JS file is as follows:

<pre><code><script data-zf-fallback="{{original-URL}}" data-zf-hash="{{hash}}"></script>
</pre></code>

Finally, insert a script in the head of your HTML file that calls the following method for each P2P distributed asset, using each asset's hash and size as parameters.

<pre><code><script>tr.publish('{{hash}}', {{asset_size}});</script></pre></code>
