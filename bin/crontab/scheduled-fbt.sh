#!/bin/sh
cd invi.sible.link/campaigns/e18
DEBUG=*,-lib:mongo:read bin/distorsioni.js --start 15 --end 0 --server https://facebook.tracking.exposed >> /tmp/sched-fbt.log 2>&1
