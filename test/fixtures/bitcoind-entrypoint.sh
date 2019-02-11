#!/bin/sh

set -exm

bitcoind  -printtoconsole -regtest -rpcallowip=0.0.0.0/0 \
	-rpcauth='test:d420a6feb7865b5827725ec037f039c8$52fe47e079807f05b5108b301c329423dce7c30132f9df010cb07d36ff22469f' &

sleep 4

bitcoin-cli -regtest -rpcuser=test -rpcpassword=J2fqb-r8YdvESyLK8DkMQCJBOyEhlRWI3VuYrul8bYI= generate 431

fg
