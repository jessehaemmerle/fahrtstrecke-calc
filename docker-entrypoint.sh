#!/bin/sh
# Substitute only ${ORS_API_KEY} to avoid mangling other JS template literals
envsubst '${ORS_API_KEY}' \
    < /usr/share/nginx/html/index.html.template \
    > /usr/share/nginx/html/index.html
