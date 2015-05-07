sudo apt-get update
sudo apt-get install -y nginx
patch /etc/nginx/sites-available/default <<EOF
24c24
< 	root /usr/share/nginx/html;
---
> 	root /www;
36a37
> 	add_header 'Access-Control-Allow-Origin' '*';
EOF
