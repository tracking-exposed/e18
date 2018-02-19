#!/bin/sh
cd invi.sible.link/campaigns/e18
DEBUG=*,-lib:mongo:read bin/opendata.js >> /tmp/sched-opendata.log 2>&1
