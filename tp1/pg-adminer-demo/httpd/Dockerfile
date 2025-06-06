FROM httpd:2.4-alpine

# Copier notre page d'accueil
COPY index.html /usr/local/apache2/htdocs/

# Copier notre configuration avec le reverse proxy
COPY httpd.conf /usr/local/apache2/conf/

# Exposer le port 80
EXPOSE 80 