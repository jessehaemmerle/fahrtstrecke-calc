FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -qO- http://localhost/ || exit 1
