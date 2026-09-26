# Serve o projeto inteiro (frontend/ + backend/) do jeito que ele já
# funciona no XAMPP: mesmo servidor, mesma raiz, caminhos relativos
# como "../backend/api" continuam funcionando sem mudar nada no código.

FROM php:8.2-apache

# Extensões que o backend precisa (PDO MySQL)
RUN docker-php-ext-install pdo pdo_mysql

# Copia o projeto inteiro para a raiz do Apache
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

# O runtime do Railway (não o build) às vezes reativa mpm_event/mpm_worker
# depois da imagem pronta, causando "More than one MPM loaded" mesmo com o
# Dockerfile correto. Por isso o fix roda aqui, na inicialização do
# container, e não como RUN no build.
CMD ["bash", "-lc", "set -e; \
  sed -i \"s/80/${PORT:-80}/g\" /etc/apache2/ports.conf /etc/apache2/sites-enabled/000-default.conf; \
  a2dismod mpm_event mpm_worker || true; \
  rm -f /etc/apache2/mods-enabled/mpm_event.* /etc/apache2/mods-enabled/mpm_worker.* || true; \
  a2enmod mpm_prefork; \
  apache2ctl -t; \
  exec apache2-foreground"]