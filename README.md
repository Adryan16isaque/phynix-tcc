# PHYNIX · EstudaAI

Plataforma web de estudos com um assistente de IA voltada a estudantes brasileiros do Ensino Médio, do ENEM e de vestibulares. Projeto de Conclusão de Curso (TCC) do CEMI-DF.

| | |
|---|---|
| **Equipe** | Adryan, Asafe, Enzo, Lívia e Riquelme |
| **Front-end** | HTML, CSS e JavaScript (módulos ES), sem framework |
| **Back-end** | PHP 8.2 puro (PDO), sem framework |
| **Banco de dados** | MySQL 8.4 |
| **IA** | API da Groq (a chave fica só no servidor) |
| **Infraestrutura** | Docker Compose (Apache + PHP e MySQL) |

---

## Sumário

1. [Teste rápido para avaliadores](#1-teste-rápido-para-avaliadores)
2. [Rodar localmente com Docker (recomendado)](#2-rodar-localmente-com-docker-recomendado)
3. [Rodar sem Docker (alternativa)](#3-rodar-sem-docker-alternativa)
4. [Publicar em um servidor](#4-publicar-em-um-servidor)
5. [Variáveis de ambiente](#5-variáveis-de-ambiente)
6. [Estrutura do projeto](#6-estrutura-do-projeto)
7. [Banco de dados](#7-banco-de-dados)
8. [Manutenção: atualizar, backup e restauração](#8-manutenção-atualizar-backup-e-restauração)
9. [Problemas comuns](#9-problemas-comuns)
10. [Segurança e LGPD](#10-segurança-e-lgpd)

---

## 1. Teste rápido para avaliadores

Você precisa de **Git** e **Docker** (Docker Desktop no Windows/macOS ou Docker Engine no Linux). Em cinco comandos o site sobe em `http://localhost:8080`:

```bash
git clone https://github.com/Adryan16isaque/phynix-tcc.git
cd phynix-tcc
cp .env.example .env                 # depois edite o .env (veja a seção 5)
docker compose up -d --build
docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < backend/schema.sql
```

Abra **http://localhost:8080**, crie uma conta e use o site.

> **Chave da IA:** sem `GROQ_API_KEY` o site funciona normalmente, mas o chat do EstudaAI responderá com erro. Para testar o chat, gere uma chave gratuita em <https://console.groq.com/keys> e coloque no `.env`.

---

## 2. Rodar localmente com Docker (recomendado)

### 2.1 Requisitos

- Git
- Docker 24+ com o plugin **Docker Compose v2** (`docker compose version` deve funcionar)
- Porta **8080** livre no computador
- Internet (para baixar as imagens e para o chat falar com a Groq)

### 2.2 Passo a passo

**1. Clonar o repositório**

```bash
git clone https://github.com/Adryan16isaque/phynix-tcc.git
cd phynix-tcc
```

**2. Criar o arquivo `.env` na raiz do projeto** (mesma pasta do `docker-compose.yml`)

```bash
cp .env.example .env
```

No Windows (PowerShell): `Copy-Item .env.example .env`

Edite o `.env`. Para uso local, estes valores bastam:

```env
DB_NAME=phynix
DB_PASS=uma-senha-qualquer
GROQ_API_KEY=cole-sua-chave-da-groq-aqui
GROQ_MODEL=openai/gpt-oss-120b
ALLOWED_ORIGINS=http://localhost:8080
APP_ENV=development
```

Use `APP_ENV=development` porque o acesso local é por `http`, sem HTTPS. O `.env` **nunca** deve ser enviado ao GitHub (já está no `.gitignore`).

**3. Subir os containers**

```bash
docker compose up -d --build
```

O Compose cria dois serviços:

- `db`: MySQL 8.4, com volume `dbdata` (os dados sobrevivem a reinícios) e *healthcheck*. Não expõe porta para fora.
- `app`: Apache + PHP 8.2, só sobe depois que o banco estiver saudável. Publicado em `127.0.0.1:8080`.

Confira se os dois estão `running`/`healthy`:

```bash
docker compose ps
```

**4. Criar as tabelas (somente na primeira vez)**

Linux, macOS e Git Bash:

```bash
docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < backend/schema.sql
```

Windows PowerShell (o operador `<` não funciona lá):

```powershell
Get-Content backend/schema.sql | docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

Confira:

```bash
docker compose exec db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES;"'
```

Devem aparecer **9 tabelas**.

**5. Acessar**

Abra **http://localhost:8080** e crie uma conta pela tela de cadastro.

### 2.3 Comandos do dia a dia

```bash
docker compose logs -f app      # logs do PHP/Apache
docker compose logs -f db       # logs do MySQL
docker compose restart app      # reinicia só a aplicação
docker compose stop             # para tudo (mantém os dados)
docker compose up -d            # sobe de novo, sem rebuild
docker compose down             # remove os containers (mantém os dados)
```

> ⚠️ **Não use `docker compose down -v`**: o `-v` apaga o volume `dbdata`, ou seja, **todo o banco de dados**. Só use se quiser zerar tudo de propósito.

---

## 3. Rodar sem Docker (alternativa)

Use apenas se não for possível instalar o Docker.

**Requisitos:** PHP 8.2+ com as extensões `pdo_mysql`, `curl` e `mbstring`; MySQL 8 (ou MariaDB 10.6+); Apache (ou o XAMPP).

1. Crie o banco e carregue o esquema:
   ```bash
   mysql -uroot -p -e "CREATE DATABASE phynix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -uroot -p phynix < backend/schema.sql
   ```
2. Crie `backend/.env` com as variáveis da [seção 5](#5-variáveis-de-ambiente), usando `DB_HOST=127.0.0.1` e o usuário/senha do seu MySQL. O back-end lê esse arquivo apenas quando a variável **não** estiver definida no ambiente.
3. Aponte o *DocumentRoot* do Apache (ou a pasta `htdocs` do XAMPP) para a pasta do projeto, com `AllowOverride All` habilitado, e abra o endereço no navegador.
4. Ajuste `ALLOWED_ORIGINS` para o endereço que você usa (por exemplo `http://localhost`).

O caminho com Docker é o testado e suportado; este serve como alternativa.

---

## 4. Publicar em um servidor

A mesma configuração do Docker serve para um servidor real (VPS, máquina da escola, etc.).

### 4.1 No servidor (Debian/Ubuntu)

```bash
# instalar Docker (método oficial resumido)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER        # sair e entrar na sessão depois

git clone https://github.com/Adryan16isaque/phynix-tcc.git
cd phynix-tcc
cp .env.example .env                 # edite: senhas fortes e a URL pública
docker compose up -d --build
docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < backend/schema.sql
```

No `.env` de produção:

```env
APP_ENV=production
ALLOWED_ORIGINS=https://seu-dominio-ou-url-publica
```

Com `APP_ENV=production` o site espera ser acessado por **HTTPS**. Em produção use uma senha forte em `DB_PASS`.

### 4.2 Expor para a internet

O container `app` escuta apenas em `127.0.0.1:8080`. Escolha uma das formas:

**Opção A. Tailscale Funnel (a que usamos no TCC).** Dá uma URL pública com HTTPS, sem abrir portas no roteador e sem IP fixo:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
sudo tailscale funnel --bg 8080
tailscale funnel status              # mostra a URL https://<máquina>.<tailnet>.ts.net
```

Use essa URL em `ALLOWED_ORIGINS` e rode `docker compose up -d` de novo para aplicar. O Funnel precisa estar habilitado na sua conta Tailscale (o próprio comando mostra o link para habilitar).

**Opção B. Domínio próprio + proxy reverso.** Em um VPS com IP público, aponte o DNS do domínio para o IP e coloque um proxy com HTTPS automático (por exemplo Caddy ou Nginx + Certbot) encaminhando para `127.0.0.1:8080`.

**Opção C. Rede local.** Para acessar de outros computadores da mesma rede, troque em `docker-compose.yml` a linha `"127.0.0.1:8080:80"` por `"8080:80"` e coloque o endereço usado (por exemplo `http://192.168.0.10:8080`) em `ALLOWED_ORIGINS`.

### 4.3 Dicas para servidor em notebook/PC próprio

- Desative a suspensão: `sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target`
- Prefira **cabo de rede** ao Wi-Fi e mantenha o equipamento na tomada.
- Os serviços já usam `restart: unless-stopped`; habilite o Docker e o Tailscale no boot: `sudo systemctl enable docker tailscaled`.

---

## 5. Variáveis de ambiente

O arquivo `.env` fica na **raiz** do projeto. O `docker-compose.yml` lê esse arquivo e repassa os valores ao container.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DB_NAME` | sim | Nome do banco (ex.: `phynix`). |
| `DB_PASS` | sim | Senha do MySQL (usuário `root` dentro da rede do Docker). |
| `GROQ_API_KEY` | para o chat | Chave da API da Groq. |
| `GROQ_API_KEYS` | não | Várias chaves separadas por vírgula, usadas em rodízio. |
| `GROQ_MODEL` | sim | Modelo da Groq (ex.: `openai/gpt-oss-120b`). |
| `ALLOWED_ORIGINS` | sim | Origem(ns) permitida(s) para as requisições (CORS), separadas por vírgula. Deve ser exatamente o endereço que aparece no navegador. |
| `APP_ENV` | sim | `development` (acesso por `http`) ou `production` (HTTPS). |

O banco de dados dentro do Docker é acessado pelo host `db` (definido no `docker-compose.yml`); não é preciso configurar `DB_HOST`.

---

## 6. Estrutura do projeto

```
phynix-tcc/
├── frontend/            # páginas, estilos e scripts (módulos ES)
├── backend/
│   ├── api/             # endpoints PHP (auth, chat, matérias, etc.)
│   ├── config/          # leitura de variáveis de ambiente
│   ├── includes/        # bootstrap, conexão com o banco, helpers
│   ├── schema.sql       # esquema do banco (9 tabelas)
│   └── ...
├── index.php            # ponto de entrada
├── Dockerfile           # imagem php:8.2-apache + pdo_mysql
├── docker-compose.yml   # serviços app + db
├── .env.example         # modelo das variáveis de ambiente
└── README.md
```

O `Dockerfile` ajusta a porta do Apache e o módulo MPM (`prefork`, exigido pelo PHP) a cada inicialização, de forma idempotente.

---

## 7. Banco de dados

- **MySQL 8.4**, charset `utf8mb4`, engine InnoDB.
- Esquema em `backend/schema.sql`: **9 tabelas** (usuários, matérias, sessões e mensagens do chat, entre outras).
- Integridade relacional por chaves estrangeiras, inclusive compostas `(user_id, subject_id)`, para que um usuário nunca referencie matéria de outro.
- `chat_messages` tem `ON DELETE CASCADE` a partir de `chat_sessions`: apagar uma conversa apaga suas mensagens.
- Senhas são armazenadas com hash (nunca em texto puro).

---

## 8. Manutenção: atualizar, backup e restauração

**Atualizar o código**

```bash
git pull
docker compose up -d --build
```

**Backup do banco**

```bash
docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > backup.sql
```

**Restaurar**

```bash
docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < backup.sql
```

Arquivos `.sql` com dados reais contêm informações de usuários: **não os envie ao GitHub**.

---

## 9. Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| `port is already allocated` / porta 8080 em uso | Outro programa usa a 8080. Pare-o ou troque a porta em `docker-compose.yml` (`"127.0.0.1:8081:80"`, por exemplo). |
| Página abre, mas login/cadastro falham | Confira `ALLOWED_ORIGINS` (deve ser idêntico ao endereço do navegador, com `http`/`https` e porta) e `APP_ENV`. Depois: `docker compose up -d`. |
| Erro de tabela inexistente (`Table ... doesn't exist`) | O esquema não foi carregado. Rode o passo 4 da seção 2.2. |
| Chat responde "Não consegui responder agora" | Verifique `GROQ_API_KEY`, `GROQ_MODEL` e a conexão. Veja `docker compose logs app`. |
| `app` reiniciando em loop | `docker compose logs app`. Em geral é `.env` ausente ou variável faltando. |
| `docker compose` não existe | Instale/atualize o Docker (Compose v2). Em versões antigas o comando era `docker-compose`. |
| Alterei o `.env` e nada mudou | Rode `docker compose up -d` (recria o container com os novos valores). |
| Quero zerar o banco | `docker compose down -v` e suba de novo (**apaga tudo**), depois repita o passo 4. |

---

## 9.1 Verificação rápida

```bash
curl -I http://localhost:8080          # deve responder HTTP 200
docker compose ps                      # db healthy, app running
```

---

## 10. Segurança e LGPD

- A chave da Groq existe só no servidor; o navegador nunca a recebe. Para a IA vai apenas o texto da conversa (papel e conteúdo), sem nome ou e-mail do usuário.
- Nunca versione `.env`, chaves ou dumps do banco.
- O banco não é exposto fora da rede interna do Docker.
- O tratamento de dados pessoais segue os princípios da **Lei nº 13.709/2018 (LGPD)**: finalidade, necessidade, segurança e transparência. Os detalhes estão descritos no texto do TCC.
- Em produção: senhas fortes, HTTPS, atualizações regulares do sistema e backup periódico.

---

Projeto acadêmico. Dúvidas sobre a instalação: abra uma *issue* neste repositório.
