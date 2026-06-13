FROM nginx:alpine

COPY nginx.conf /tmp/nginx.conf.template
COPY index.html style.css app.js /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -qO- http://127.0.0.1/ || exit 1

# Nur ${STADIA_API_KEY} ersetzen – nginx-eigene $variablen bleiben erhalten
CMD ["/bin/sh", "-c", \
    "envsubst '${STADIA_API_KEY}' < /tmp/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
