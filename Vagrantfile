Vagrant.configure(2) do |config|

  config.vm.box = "ubuntu/trusty64"

  config.vm.network "forwarded_port", guest: 80, host: 8080

  config.vm.synced_folder ".", "/vagrant", disabled: true

  config.vm.synced_folder "www", "/www", type: "rsync"

  config.vm.provision "shell" do |s|
    s.path = "provision/setup.sh"
  end

  config.vm.provision "shell", run: "always", inline: <<-SHELL
    tc qdisc add dev eth0 root handle 1:0 htb default 10
    tc class add dev eth0 parent 1:0 classid 1:10 htb rate 64kbps ceil 96kbps prio 0
    iptables -A OUTPUT -t mangle -p tcp --sport 80 -j MARK --set-mark 10
    tc filter add dev eth0 parent 1:0 prio 0 protocol ip handle 10 fw flowid 1:10
  SHELL

end
