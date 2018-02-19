#!/bin/sh
cd facebook
DEBUG=*,-lib:mongo:read api='https://facebook.tracking.exposed/api/v1/metaxpt/e18/href/0' bin/dandelion.js >> /tmp/sched-dandelion.log 2>&1
