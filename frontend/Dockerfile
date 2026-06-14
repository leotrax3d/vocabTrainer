# Frontend: statische App via nginx, inkl. Reverse-Proxy auf das Backend.
# Build-Kontext ist das Projekt-Wurzelverzeichnis (siehe docker-compose.yml),
# damit die statischen Dateien im Repo-Root kopiert werden koennen.
FROM nginx:1.27-alpine

# nginx-Konfiguration (statische Auslieferung + /api-Proxy).
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Die eigentliche App.
COPY index.html app.js styles.css beispiel-vokabeln.json /usr/share/nginx/html/

EXPOSE 80
