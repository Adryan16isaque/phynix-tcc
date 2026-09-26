# Phynix / EstudaAI

App de estudos com chat de IA, planner de matérias, calendário de
streaks e conquistas — front-end estático (HTML/CSS/JS, módulos ES) +
back-end em PHP puro com MySQL.

**Rodando em produção:** https://phynix-tcc-production.up.railway.app/
(Railway — veja a seção [Deploy em produção](#deploy-em-produção-railway))

```
phynix-tcc-main/
├── index.php                 ← redireciona "/" para "/frontend/"
├── Dockerfile                ← usado só no deploy (Railway)
├── frontend/                 ← abra frontend/index.html no navegador
│   ├── index.html
│   ├── accessibility.js
│   ├── assets/fenix.png
│   ├── css/
│   │   ├── main.css
│   │   ├── accessibility.css
│   │   └── components/       (chat.css, etc.)
│   └── js/                   ← módulos ES
│       ├── main.js
│       ├── auth.js
│       ├── state.js
│       ├── api.js
│       ├── planner.js
│       ├── calendar.js
│       ├── achievements.js
│       ├── chat.js
│       ├── tabs.js
│       └── ui.js
└── backend/                  ← roda no PHP/XAMPP
    ├── .env                  (crie a partir do .env.example — NÃO versionar)
    ├── .env.example
    ├── config/
    │   ├── config.php        (lê os valores do .env — não editar direto)
    │   ├── database.php
    │   └── env.php
    ├── includes/
    │   ├── bootstrap.php
    │   ├── response.php
    │   ├── stats.php
    │   └── achievements.php
    ├── api/
    │   ├── subjects.php
    │   ├── calendar.php
    │   ├── complete.php
    │   ├── chat.php
    │   ├── achievements.php
    │   ├── settings.php      ⚠️ ainda NÃO implementado (ver Pendências)
    │   └── auth/
    │       ├── login.php
    │       ├── register.php
    │       ├── logout.php
    │       └── me.php
    └── schema.sql
```

---

## ⚠️ Segurança — leia antes de tudo

1. **Segredos ficam só no `.env`.** `backend/.env` está no
   `.gitignore` e nunca deve ser commitado. Use `backend/.env.example`
   como modelo (sem valores reais) para saber quais variáveis
   preencher: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`,
   `GROQ_API_KEY`, `GROQ_MODEL`, `ALLOWED_ORIGINS`, `APP_ENV`.
2. A chave da **Groq** só existe no back-end (`backend/.env` →
   `config.php`) e nunca é enviada ao navegador — o chat sempre passa
   por `/api/chat.php`.
3. **Se você usou a senha do banco ou a chave da Groq em algum print,
   chat ou log colado em algum lugar público, gere valores novos.**
   Credenciais que já apareceram em texto (mesmo que "só" numa
   conversa ou issue) devem ser tratadas como comprometidas.

---

## Rodando localmente (XAMPP/Laragon)

Use esta seção pra desenvolver, testar mudanças antes de subir pro ar,
ou se o deploy em produção estiver fora do ar e você precisar voltar
a rodar tudo na sua máquina.

### 1. Requisitos

- **XAMPP** ou **Laragon** (PHP 8.0+ com `pdo_mysql`, `curl` e
  `mbstring` — as três já vêm ativadas por padrão em ambos — e
  MySQL/MariaDB)
- Uma chave de API da **Groq** (grátis em https://console.groq.com) —
  necessária para o chat funcionar

### 2. Instalação

1. Copie a pasta do projeto inteira para dentro de `htdocs`
   (ex.: `C:\xampp\htdocs\phynix-tcc-main` no Windows).
2. Abra o **XAMPP Control Panel** e inicie **Apache** e **MySQL**.
3. Crie o banco de dados: abra o **phpMyAdmin**
   (`http://localhost/phpmyadmin`), vá em "Importar" e envie o
   arquivo `backend/schema.sql` — ele cria o banco `phynix` e todas
   as tabelas automaticamente (já com o isolamento de dados por
   usuário corrigido nas foreign keys).
4. Copie `backend/.env.example` para `backend/.env` e preencha:

   ```
   DB_HOST=localhost
   DB_NAME=phynix
   DB_USER=root
   DB_PASS=
   GROQ_API_KEY=gsk_sua_chave_aqui
   GROQ_MODEL=llama-3.3-70b-versatile
   ALLOWED_ORIGINS=
   APP_ENV=development
   ```

   (senha vazia é o padrão do MySQL do XAMPP)

5. Acesse **`http://localhost/phynix-tcc-main/frontend/index.html`**
   no navegador.

Front e back ficam na mesma pasta/domínio (`localhost`), então não é
necessário preencher `ALLOWED_ORIGINS` — deixe vazio.

### 3. Primeiro uso

A tela inicial é de **login/cadastro**. Clique em "Criar conta",
cadastre-se, e você já entra logado automaticamente (sessão via
cookie PHP).

---

## Deploy em produção (Railway)

O projeto está publicado no Railway com dois serviços no mesmo
projeto: o app PHP (via Dockerfile) e um banco MySQL gerenciado.

### Por que Dockerfile em vez da detecção automática do Railway

O projeto não tem `composer.json` e usa caminhos relativos
(`../backend/api` no `js/api.js`), então front e back precisam ser
servidos pelo **mesmo** Apache, na mesma raiz — a detecção automática
de PHP do Railway (Nixpacks) não reproduz essa estrutura de pastas
irmãs corretamente. O `Dockerfile` na raiz resolve isso copiando o
projeto inteiro (mantendo a mesma estrutura do XAMPP) para dentro de
uma imagem `php:8.2-apache`.

### Passo a passo (resumo — se for redeployar do zero)

1. **Suba o projeto pro GitHub**, com o `Dockerfile` na raiz do repo
   (mesmo nível de `frontend/` e `backend/`). Não suba `backend/.env`.
2. No Railway: **New Project → Deploy from GitHub repo**, selecione o
   repositório. O Railway detecta o `Dockerfile` e builda com ele.
3. **Adicione o serviço MySQL**: `+ New → Database → Add MySQL`.
4. No serviço do **app** (não no do MySQL) → aba **Variables**,
   adicione:
   - `DB_HOST` = `${{MySQL.MYSQLHOST}}`
   - `DB_NAME` = `${{MySQL.MYSQLDATABASE}}`
   - `DB_USER` = `${{MySQL.MYSQLUSER}}`
   - `DB_PASS` = `${{MySQL.MYSQLPASSWORD}}`
   - `APP_ENV` = `production`
   - `GROQ_API_KEY` = sua chave
   - `GROQ_MODEL` = `llama-3.3-70b-versatile`
   - `ALLOWED_ORIGINS` = vazio (front e back estão no mesmo domínio)

   Use o autocomplete `${{ }}` do próprio Railway em vez de digitar na
   mão, pra não errar o nome da variável nem colar espaço em branco
   sem querer.
5. **Rode o `schema.sql` no banco do Railway.** Como o banco já se
   chama `railway` (não `phynix`), remova as linhas
   `CREATE DATABASE`/`USE phynix` do início do arquivo antes de rodar.
   Conecte via um cliente (DBeaver, MySQL Workbench) usando as
   credenciais públicas do MySQL (Settings → Networking → Public
   Networking, ativado temporariamente) ou pela própria aba **Data**
   do Railway.
6. Gere o domínio público em Settings → Networking → Generate Domain.
7. Acesse `https://SEU-APP.up.railway.app/` (o `index.php` na raiz
   redireciona automaticamente pra `/frontend/`).

### Bugs específicos do Railway que já foram resolvidos no Dockerfile

- **`AH00534: More than one MPM loaded`** — bug conhecido do Railway
  com imagens `php:*-apache`: o runtime reativa `mpm_event` depois do
  build. O fix (já incluído no `Dockerfile`) roda `a2dismod`/`a2enmod`
  na inicialização do container (`CMD`), não só no build.
- **Porta**: o Railway injeta a porta real em `$PORT`; o `CMD` ajusta
  o Apache pra escutar nela em vez da 80 fixa.
- **403 Forbidden na raiz**: resolvido com o `index.php` na raiz do
  repo, que redireciona pra `/frontend/`.

### Depois do deploy — checklist de segurança

- Desative o **Public Access** do MySQL (Settings → Networking) depois
  de rodar migrações — o app conversa com o banco pela rede interna
  do Railway (`mysql.railway.internal`), não precisa do público ligado.
- **Não escale pra mais de 1 réplica** no serviço do app: o login usa
  sessão de arquivo do PHP, que não é compartilhada entre réplicas.
- Trial do Railway: 30 dias **ou** $5 de crédito (o que vier primeiro),
  depois cai pro plano Free ($1/mês). Para manter o app no ar sem
  interrupção, considere o plano Hobby ($5/mês).

---

## Funcionalidades recentes

- **Markdown nas respostas da IA**: o chat agora renderiza negrito,
  listas, código etc. (via `marked.js` + `DOMPurify`, carregados por
  CDN) em vez de mostrar os símbolos de Markdown literalmente.
  Mensagens do usuário continuam como texto puro por segurança.
