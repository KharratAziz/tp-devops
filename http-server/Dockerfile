FROM httpd:2.4

# Copy the custom httpd configuration
COPY ./http-server/my-httpd.conf /usr/local/apache2/conf/httpd.conf

# Copy the frontend application into the htdocs directory
COPY ./frontend/ /usr/local/apache2/htdocs/
