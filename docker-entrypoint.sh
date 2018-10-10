#!/bin/bash
set -e

if [ ! -f "/app/config/production.toml" ] ; then 
    echo "No production.toml, copying from docker-production.toml.tmpl"
    cp /app/config/docker-production.toml.tmpl /app/config/production.toml
fi
if [ ! -f "/app/config/local.js" ] ; then
    echo "No local.js, copying from docker-local.js.tmpl"
    cp /app/config/docker-local.js.tmpl /app/config/local.js
fi
if [ ! -f "/app/workers/reports/config/production.toml" ] ; then 
    echo "No production.toml for reports"
    if [ -f "/app/config/production.toml" ] ; then 
        echo "copying config/production.toml to reports config directory"
        cp /app/config/production.toml /app/workers/reports/config/production.toml
    else
        echo "copying config/docker-production.toml.tmpl to reports config directory as production.toml"
        cp /app/config/docker-production.toml.tmpl /app/workers/reports/config/production.toml
        echo "copying config/docker-local.js.tmpl to reports config directory as local.js"
        cp /app/config/docker-local.js.tmpl /app/workers/reports/config/local.js
    fi
fi
if [ ! -f "/app/workers/reports/config/local.js" ] ; then
    echo "No local.js for reports"
    if [ -f "/app/config/local.js" ] ; then
        echo "copying config/local.js to reports config directory"
        cp /app/config/local.js /app/workers/reports/config/local.js
    else
        echo "copying config/docker-local.js.tmpl to reports config directory as local.js"
        cp /app/config/docker-local.js.tmpl /app/workers/reports/config/local.js
    fi
fi
exec "$@"