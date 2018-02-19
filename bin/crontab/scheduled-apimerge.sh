#!/bin/sh -x
cd fbapitools/collected
last=`ls -tr | tail -1`
cd ..
echo -e "\n\n`date` begin:" >> /tmp/sched-fbpostsaver.log
PYTHONIOENCODING=UTF-8 python3 ./fbpostsaver.py ../invi.sible.link/campaigns/e18/fonti/Fonti\ Selezionate.json $last >> /tmp/sched-fbpostsaver.log 2>&1
cd collected
ultima=`ls -tr | tail -1`
nuova=`echo "/home/storyteller/fbapitools/collected/$ultima"`
cd /home/storyteller/invi.sible.link/campaigns/e18/
echo "nuova $nuova"
DEBUG=* source=$nuova bin/apiimport.js >> /tmp/sched-apiimport.log 2>&1

dayn=`date +%j | sed -es/^0//`
x=$(($dayn - 11))
echo $x
day=$x DEBUG=*,-lib:mongo:read node bin/merge-all.js >> /tmp/sched-merge.log 2>&1
