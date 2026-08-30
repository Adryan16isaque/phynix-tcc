# Phynix / EstudaAI

App de estudos com chat de IA, planner de matérias, calendário de
streaks e conquistas — front-end estático (HTML/CSS/JS) + back-end
em PHP puro com MySQL.

```
phynix/
├── frontend/                 ← abra isto no navegador
│   ├── index.html
│   ├── main.css
│   ├── accessibility.css
│   ├── accessibility.js
│   ├── auth.css              (novo — tela de login/cadastro)
│   ├── app.js
│   └── assets/fenix.png
└── backend/                  ← roda no PHP/XAMPP
    ├── config/
    │   ├── config.php        (edite com seus dados — NÃO versionar)
    │   ├── config.example.php
    │   └── database.php
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
    │   ├── settings.php
    │   ├── achievements.php
    │   └── auth/
    │       ├── login.php
    │       ├── register.php
    │       ├── logout.php
    │       └── me.php
    └── schema.sql
```

---

## ⚠️ Segurança — leia antes de tudo

1. **Uma chave de API real (`sk-ant-...`) estava exposta** num arquivo
   `_env` que você enviou. Se ainda não fez, **revogue essa chave
   agora** no painel da Anthropic e gere uma nova. Nunca a coloque de
   volta em texto puro — ela não é usada em nada deste projeto.
2. O `README.md` original avisava que a chave da Groq estava exposta
   no `app.js` antigo. Isso foi corrigido: o chat agora sempre passa
   pelo back-end (`/api/chat.php`), a chave da Groq fica só no
   `config.php` do servidor e nunca é enviada ao navegador.
3. `backend/config/config.php` está no `.gitignore` — edite os
   valores reais nele, mas não o suba pro GitHub. Use
   `config.example.php` como referência/modelo versionável.

---

## 1. Requisitos

- **XAMPP** ou **Laragon** (PHP 8.0+ com `pdo_mysql`, `curl` e
  `mbstring` — as três já vêm ativadas por padrão em ambos, e
  MySQL/MariaDB)
- Uma chave de API da **Groq** (grátis em https://console.groq.com) —
  necessária para o chat funcionar

## 2. Instalação (XAMPP)

1. Copie a pasta `phynix` inteira para dentro de `htdocs`
   (normalmente `C:\xampp\htdocs\phynix` no Windows).
2. Abra o **XAMPP Control Panel** e inicie **Apache** e **MySQL**.
3. Crie o banco de dados: abra o **phpMyAdmin**
   (`http://localhost/phpmyadmin`), vá em "Importar" e envie o
   arquivo `backend/schema.sql` — ele cria o banco `phynix` e todas
   as tabelas automaticamente.
4. Edite `backend/config/config.php`:

   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'phynix');
   define('DB_USER', 'root');
   define('DB_PASS', '');              // senha padrão do XAMPP é vazia

   define('GROQ_API_KEY', 'gsk_sua_chave_aqui');
   define('GROQ_MODEL', 'llama-3.3-70b-versatile');
   ```

5. Acesse **`http://localhost/phynix/frontend/index.html`** no
   navegador.

Front e back ficam na mesma pasta/domínio (`localhost`), então não é
necessário mexer em `ALLOWED_ORIGIN` — deixe `null`.

## 3. Primeiro uso

A tela inicial agora é de **login/cadastro** (antes esse endpoint
existia no back-end, mas nada no front chamava). Clique em
"Criar conta", cadastre-se, e você já entra logado automaticamente
— sessão via cookie PHP, a mesma sessão de antes.

---
