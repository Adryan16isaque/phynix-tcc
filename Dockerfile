# Serve o projeto inteiro (frontend/ + backend/) do jeito que ele já
# funciona no XAMPP: mesmo servidor, mesma raiz, caminhos relativos
# como "../backend/api" continuam funcionando sem mudar nada no código.

FROM php:8.2-apache

# Extensões que o backend precisa (PDO MySQL)
RUN docker-php-ext-install pdo pdo_mysql

# Copia o projeto inteiro para a raiz do Apache
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

# Fix para um bug conhecido no Railway: a imagem php:*-apache às vezes
# sobe com dois MPMs habilitados ao mesmo tempo (mpm_event + mpm_prefork),
# o que trava o Apache com "More than one MPM loaded". Força só o prefork.
RUN a2dismod mpm_event mpm_worker 2>/dev/null; a2enmod mpm_prefork

EXPOSE 80

# O Railway injeta a porta certa na variável $PORT — ajusta o Apache
# pra escutar nela em vez da 80 fixa.
CMD sh -c "sed -i \"s/80/\${PORT:-80}/g\" /etc/apache2/ports.conf /etc/apache2/sites-enabled/000-default.conf && apache2-foreground"