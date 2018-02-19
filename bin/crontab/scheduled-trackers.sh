#!/bin/sh
cd invi.sible.link
MAX=30 DEBUG=* bin/analyzeGroup.js --campaign e18 --daysago 0 >> /tmp/sched-trackers.log 2>&1
