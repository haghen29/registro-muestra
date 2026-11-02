# Imagen para Dokploy: PHP + Apache, con la carpeta public/ como raíz del sitio
FROM php:8.3-apache

# Extensión para MariaDB y módulos de Apache que usa el .htaccess
RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite headers remoteip

# Configuración de Apache:
# - DocumentRoot en public/ (lo demás del repo no se puede abrir desde afuera)
# - AllowOverride All para que funcione el .htaccess (rutas limpias, bloqueos y cabeceras)
# - remoteip: detrás de Traefik, REMOTE_ADDR pasa a ser la IP real del visitante
#   (si no, todos tendrían la IP de Traefik y el bloqueo de PIN / límite de registros
#   afectaría a todos juntos). Solo se confía en IPs de la red interna de Docker.
RUN { \
  echo 'ServerName localhost'; \
  echo 'ServerTokens Prod'; \
  echo 'ServerSignature Off'; \
  echo 'RemoteIPHeader X-Forwarded-For'; \
  echo 'RemoteIPTrustedProxy 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16'; \
  echo 'SetEnvIf X-Forwarded-Proto "^https$" HTTPS=on'; \
  echo '<VirtualHost *:80>'; \
  echo '  DocumentRoot /var/www/html/public'; \
  echo '  <Directory /var/www/html/public>'; \
  echo '    AllowOverride All'; \
  echo '    Require all granted'; \
  echo '  </Directory>'; \
  echo '</VirtualHost>'; \
} > /etc/apache2/sites-available/000-default.conf

# No mostrar la versión de PHP en las respuestas
RUN echo 'expose_php = Off' > /usr/local/etc/php/conf.d/seguridad.ini

COPY . /var/www/html/

# La API escribe la marca _esquema-v6.ok en public/api la primera vez que conecta
RUN chown -R www-data:www-data /var/www/html/public/api

EXPOSE 80
