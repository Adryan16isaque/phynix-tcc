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

# O Railway fornece a variável PORT em runtime.
# Substituímos somente as diretivas exatas de porta do Apache,
# evitando alterar valores como 8080 para 80808080 em reinicializações.
CMD ["bash", "-lc", "set -e; \
  PORT_VALUE=\"${PORT:-80}\"; \
  sed -i -E \"s/^Listen [0-9]+$/Listen ${PORT_VALUE}/\" /etc/apache2/ports.conf; \
  sed -i -E \"s#^<VirtualHost \\*:[0-9]+>#<VirtualHost *:${PORT_VALUE}>#\" /etc/apache2/sites-enabled/000-default.conf; \
  a2dismod mpm_event mpm_worker || true; \
  rm -f /etc/apache2/mods-enabled/mpm_event.* /etc/apache2/mods-enabled/mpm_worker.* || true; \
  a2enmod mpm_prefork; \
  apache2ctl -t; \
  exec apache2-foreground"]