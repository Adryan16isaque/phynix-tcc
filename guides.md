# Phynix / EstudaAI

Sistema de estudos com **planner de matérias**, **registro de horas**, **calendário de estudos**, **streaks**, **conquistas**, **autenticação de usuários**, **configuração de meta diária** e **chat com IA**.

A aplicação é dividida em duas partes:

- **Frontend:** HTML + CSS + JavaScript modular, servido como arquivos estáticos.
- **Backend:** PHP puro + MySQL/MariaDB, responsável por autenticação, persistência, regras de negócio e integração com a API da Groq.

> **Importante:** o projeto atual não depende de Node.js, npm, Vite ou framework frontend. A execução local foi pensada para **XAMPP/Laragon** ou outro servidor capaz de servir PHP e MySQL/MariaDB.

---

## 1. Visão geral da arquitetura

O fluxo principal da aplicação é:

```text
Navegador
   │
   ▼
Frontend (HTML / CSS / JS)
   │
   │ fetch() + cookie de sessão
   ▼
Backend PHP (/backend/api)
   │
   ├── autenticação / sessão
   ├── regras de negócio
   ├── estatísticas
   ├── conquistas
   └── integração com Groq
   │
   ▼
MySQL / MariaDB
```

O frontend **não acessa o banco diretamente**. Todas as operações persistentes passam pela API PHP.

A chave da Groq também **não deve ficar no frontend**. O navegador chama `backend/api/chat.php`, e somente o servidor se comunica com a Groq.

---

## 2. Estrutura do projeto

```text
phynix-fixed-css/
│
├── README.md
├── .gitignore
│
├── frontend/
│   ├── index.html
│   ├── accessibility.js
│   ├── assets/
│   │   └── fenix.png
│   │
│   ├── css/
│   │   ├── main.css
│   │   ├── accessibility.css
│   │   └── components/
│   │       ├── achievements.css
│   │       ├── auth.css
│   │       ├── calendar.css
│   │       ├── chat.css
│   │       └── planner.css
│   │
│   └── js/
│       ├── main.js
│       ├── api.js
│       ├── auth.js
│       ├── achievements.js
│       ├── calendar.js
│       ├── chat.js
│       ├── planner.js
│       ├── settings.js
│       ├── state.js
│       ├── tabs.js
│       └── ui.js
│
└── backend/
    ├── .env.example
    ├── schema.sql
    │
    ├── config/
    │   ├── config.php
    │   ├── database.php
    │   └── env.php
    │
    ├── includes/
    │   ├── bootstrap.php
    │   ├── response.php
    │   ├── stats.php
    │   └── achievements.php
    │
    └── api/
        ├── achievements.php
        ├── calendar.php
        ├── chat.php
        ├── complete.php
        ├── settings.php
        ├── subjects.php
        │
        └── auth/
            ├── login.php
            ├── logout.php
            ├── me.php
            └── register.php
```

### Responsabilidade de cada camada

**Frontend**

- `index.html`: estrutura das telas e componentes.
- `css/`: estilos gerais e estilos específicos de componentes.
- `js/main.js`: ponto de entrada e exposição controlada das funções usadas pelo HTML.
- `js/api.js`: wrapper central para `fetch()` e comunicação com o backend.
- `js/state.js`: estado em memória do frontend.
- `js/auth.js`: login, cadastro, sessão e logout.
- `js/planner.js`: matérias e lançamento de horas.
- `js/calendar.js`: calendário, dias estudados e streak.
- `js/achievements.js`: exibição e atualização das conquistas.
- `js/chat.js`: sessões, mensagens, edição e exclusão do histórico de chat.
- `js/settings.js`: meta diária.
- `js/tabs.js` e `js/ui.js`: navegação e funções visuais.

**Backend**

- `api/`: endpoints HTTP consumidos pelo frontend.
- `config/`: carregamento do `.env`, conexão/configuração do banco e configurações gerais.
- `includes/`: funções compartilhadas de inicialização, respostas JSON, estatísticas e conquistas.
- `schema.sql`: criação do banco e das tabelas.

---

## 3. Requisitos

Para executar localmente, tenha:

- **PHP 8.0 ou superior**;
- **MySQL 8+ ou MariaDB compatível**;
- extensão PHP **PDO MySQL**;
- extensão **cURL**;
- extensão **mbstring**;
- **Apache** ou outro servidor HTTP capaz de executar PHP;
- uma chave da **Groq**, caso o chat com IA seja utilizado.

### Ambiente recomendado

O projeto foi estruturado para uso simples com **XAMPP** ou **Laragon**.

Não há `package.json` nem etapa obrigatória de `npm install`.

---

## 4. Instalação no XAMPP

### 4.1. Copiar o projeto

Coloque a pasta do projeto dentro do `htdocs`:

```text
C:\xampp\htdocs\phynix-fixed-css
```

A estrutura deve terminar ficando parecida com:

```text
C:\xampp\htdocs\phynix-fixed-css\frontend\index.html
C:\xampp\htdocs\phynix-fixed-css\backend\api\...
```

### 4.2. Iniciar os serviços

No XAMPP Control Panel, inicie:

- **Apache**
- **MySQL**

### 4.3. Criar o banco

Abra:

```text
http://localhost/phpmyadmin
```

Depois importe o arquivo:

```text
backend/schema.sql
```

O script cria automaticamente o banco `phynix` e suas tabelas.

Também é possível executar o SQL pelo cliente do MySQL/MariaDB:

```bash
mysql -u root -p < backend/schema.sql
```

### 4.4. Configurar o ambiente

Copie:

```text
backend/.env.example
```

para:

```text
backend/.env
```

No Windows, pode ser simplesmente uma cópia manual. Em ambientes com shell, o equivalente é:

```bash
cp backend/.env.example backend/.env
```

Depois preencha pelo menos:

```env
DB_HOST=localhost
DB_NAME=phynix
DB_USER=root
DB_PASS=

GROQ_API_KEY=coloque_sua_chave_aqui
GROQ_MODEL=llama-3.3-70b-versatile

ALLOWED_ORIGINS=
APP_ENV=development
```

### 4.5. Acessar o sistema

Abra:

```text
http://localhost/phynix-fixed-css/frontend/index.html
```

A autenticação ocorre pela sessão do PHP.

---

## 5. Configuração do `.env`

O arquivo `backend/.env` é **local e privado**. Ele é ignorado pelo Git.

### Variáveis disponíveis

| Variável          | Finalidade                   | Exemplo                             |
| ----------------- | ---------------------------- | ----------------------------------- |
| `DB_HOST`         | Host do banco                | `localhost`                         |
| `DB_NAME`         | Nome do banco                | `phynix`                            |
| `DB_USER`         | Usuário do banco             | `root`                              |
| `DB_PASS`         | Senha do banco               | vazio ou sua senha                  |
| `GROQ_API_KEY`    | Chave privada da Groq        | `gsk_...`                           |
| `GROQ_MODEL`      | Modelo utilizado pelo chat   | `llama-3.3-70b-versatile`           |
| `ALLOWED_ORIGINS` | Origens permitidas pelo CORS | vazio ou lista separada por vírgula |
| `APP_ENV`         | Ambiente de execução         | `development` / `production`        |

### CORS

Quando frontend e backend estão na mesma instalação do XAMPP, com o caminho padrão do projeto, `ALLOWED_ORIGINS` pode permanecer vazio.

Caso frontend e backend sejam servidos de origens diferentes, informe-as separadas por vírgula, por exemplo:

```env
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

---

## 6. Banco de dados

O banco usa relacionamentos por `user_id`, fazendo com que os dados fiquem separados por usuário.

### Tabelas principais

| Tabela              | Função                              |
| ------------------- | ----------------------------------- |
| `users`             | usuários, e-mail e hash de senha    |
| `subjects`          | matérias do planner                 |
| `hours_log`         | horas lançadas por matéria e mês    |
| `studied_days`      | dias marcados como estudados        |
| `daily_completions` | matérias concluídas em cada dia     |
| `study_log`         | resumo diário de horas e conclusões |
| `achievements`      | conquistas desbloqueadas            |
| `chat_sessions`     | sessões/conversas do chat           |
| `chat_messages`     | mensagens de cada conversa          |
| `settings`          | meta diária do usuário              |

### Histórico do chat

O histórico é persistido no banco e não depende de `localStorage` como fonte principal.

A relação é:

```text
users
  │
  └── chat_sessions
          │
          └── chat_messages
```

Uma sessão contém várias mensagens. O frontend pode listar as sessões e, ao abrir uma delas, carregar todas as mensagens correspondentes.

As `foreign keys` usam `ON DELETE CASCADE`, então os registros dependentes são removidos quando o registro pai é excluído.

---

## 7. Autenticação e sessão

A autenticação é feita pelo backend PHP.

### Cadastro

`POST /backend/api/auth/register.php`

Exemplo de corpo:

```json
{
  "name": "Nome do usuário",
  "email": "usuario@email.com",
  "password": "senha123"
}
```

Regras atuais:

- nome, e-mail e senha são obrigatórios;
- e-mail precisa ser válido;
- senha precisa ter pelo menos 6 caracteres;
- a senha é armazenada usando `password_hash()`;
- uma configuração padrão de 4 horas diárias é criada;
- o usuário já fica autenticado após o cadastro.

### Login

`POST /backend/api/auth/login.php`

### Sessão atual

`GET /backend/api/auth/me.php`

Retorna o usuário autenticado ou `null` quando não existe sessão.

### Logout

`POST /backend/api/auth/logout.php`

A sessão PHP é destruída no servidor.

---

## 8. API

Todos os endpoints abaixo, exceto os endpoints de autenticação, exigem usuário autenticado.

### Autenticação

| Método | Endpoint                 | Função                       |
| ------ | ------------------------ | ---------------------------- |
| `POST` | `/api/auth/register.php` | cria uma conta               |
| `POST` | `/api/auth/login.php`    | realiza login                |
| `POST` | `/api/auth/logout.php`   | encerra a sessão             |
| `GET`  | `/api/auth/me.php`       | consulta o usuário da sessão |

### Matérias / Planner

| Método   | Endpoint                   | Função                                       |
| -------- | -------------------------- | -------------------------------------------- |
| `GET`    | `/api/subjects.php`        | lista matérias com progresso e status do dia |
| `POST`   | `/api/subjects.php`        | cria uma matéria                             |
| `PUT`    | `/api/subjects.php`        | atualiza horas do mês                        |
| `DELETE` | `/api/subjects.php?id=123` | remove uma matéria                           |

Criação de matéria:

```json
{
  "name": "Matemática",
  "targetHours": 40,
  "days": 5,
  "color": "#4f8aff"
}
```

### Conclusão diária

`POST /api/complete.php`

Alterna a conclusão de uma matéria no dia atual e atualiza dados relacionados ao streak/conquistas.

### Calendário

`GET /api/calendar.php?year=2026&month=8`

Retorna dias estudados e estatísticas do mês.

`POST /api/calendar.php`

Exemplo:

```json
{
  "date": "2026-08-30"
}
```

Usado para alternar manualmente um dia marcado.

### Conquistas

`GET /api/achievements.php`

Lista as conquistas e informa quais já foram desbloqueadas pelo usuário.

### Chat

`GET /api/chat.php?list=1`

Lista as conversas.

`GET /api/chat.php?id=123`

Carrega as mensagens de uma conversa.

`POST /api/chat.php`

Exemplo:

```json
{
  "message": "Explique equação do segundo grau",
  "sessionId": 123
}
```

`sessionId` é opcional. Sem ele, uma nova sessão é criada.

`PUT /api/chat.php`

Edita uma mensagem do usuário e gera novamente a resposta da IA a partir daquele ponto.

`DELETE /api/chat.php?id=123`

Exclui a conversa e as mensagens relacionadas.

### Configurações

`GET /api/settings.php`

Retorna a meta diária.

`POST /api/settings.php`

Exemplo:

```json
{
  "goal": 4
}
```

O valor aceito fica entre **1 e 24 horas**.

---

## 9. Chat com IA

O chat utiliza a **Groq** no backend.

Fluxo:

```text
Frontend
   ↓
POST /api/chat.php
   ↓
PHP monta o contexto da conversa
   ↓
Groq API
   ↓
Resposta da IA
   ↓
chat_messages (persistência)
   ↓
Frontend
```

### Segurança da chave

A variável `GROQ_API_KEY` existe somente no ambiente do servidor.

Nunca coloque a chave em:

- `frontend/js/*.js`;
- `index.html`;
- CSS;
- repositório público;
- arquivo enviado para outras pessoas.

Caso uma chave real seja exposta em algum momento, ela deve ser **revogada e substituída**.

---

## 10. Estado do frontend x persistência

O `state.js` atual mantém dados em memória para a interface funcionar de forma rápida, mas o estado persistente continua sendo responsabilidade do backend/MySQL.

Exemplo do fluxo de uma matéria:

```text
Usuário altera horas
       ↓
planner.js
       ↓
api.js
       ↓
PUT /api/subjects.php
       ↓
MySQL
       ↓
JSON com monthHours / totalHours / progressPct
       ↓
state.js
       ↓
renderização da interface
```

Isso é importante porque o projeto atual **não deve voltar a depender de `localStorage` como banco de dados principal**.

---

## 11. Conquistas e streak

As conquistas são calculadas no backend com base nos dados persistidos.

Os módulos internos principais são:

- `backend/includes/stats.php`
- `backend/includes/achievements.php`
- `backend/api/achievements.php`

Eventos como criação de matéria, lançamento de horas, conclusão diária e uso do chat podem disparar a verificação das conquistas correspondentes.

O calendário utiliza registros de `studied_days` e `study_log` para determinar os dias de estudo e estatísticas relacionadas.

---

## 12. Principais decisões arquiteturais

### O que fica no frontend

- apresentação;
- navegação;
- interação do usuário;
- estado temporário da interface;
- chamadas HTTP para a API;
- renderização dos componentes.

### O que fica no backend

- autenticação;
- autorização por usuário;
- acesso ao banco;
- regras de persistência;
- cálculos persistentes;
- conquistas e estatísticas derivadas;
- integração com serviços externos, como a Groq.

Essa divisão permite evoluir a interface sem precisar mover regras de segurança para o navegador.

---

## 13. Segurança

O projeto foi organizado para manter dados sensíveis no servidor.

### Proteções importantes já presentes

- senha armazenada com `password_hash()`;
- uso de consultas preparadas com PDO;
- sessão PHP com `HttpOnly`;
- `SameSite=Lax`;
- `session.use_strict_mode`;
- regeneração do ID de sessão no login;
- validação do usuário autenticado em endpoints protegidos;
- verificação de que sessões do chat pertencem ao usuário solicitante;
- chave da Groq fora do frontend;
- `.env` ignorado pelo Git.

### Em produção

Use HTTPS e ajuste:

```env
APP_ENV=production
```

Quando `APP_ENV=production`, o backend desativa a exibição de erros PHP ao usuário e ativa o cookie de sessão `Secure`.

---

## 14. Git e arquivos que não devem ser versionados

O `.gitignore` atual cobre, entre outros:

- `.env` e arquivos derivados;
- chaves/certificados (`*.pem`, `*.key`, `*.crt`, etc.);
- pastas de IDE;
- logs e temporários;
- `node_modules/` e `vendor/`;
- builds e caches;
- bancos locais e backups;
- arquivos `.zip`, `.rar` e `.7z`.

O único arquivo de ambiente que deve servir como modelo versionável é:

```text
backend/.env.example
```

---

## 15. Troubleshooting

### Apache não inicia

Normalmente significa conflito de porta, especialmente `80` ou `443`. Verifique os serviços que estão utilizando essas portas no Windows e a configuração do Apache no XAMPP.

### MySQL não inicia

Pode existir conflito com outro serviço MySQL/MariaDB instalado na máquina. Verifique a porta configurada e o serviço que já está rodando.

### Erro de conexão com banco

Confira no `backend/.env`:

```env
DB_HOST=
DB_NAME=
DB_USER=
DB_PASS=
```

Também confirme se o banco `phynix` foi criado com sucesso pelo `schema.sql`.

### Erro 404 nas APIs

Confirme que o endereço está sendo acessado dentro do Apache e que a estrutura de pastas está correta:

```text
htdocs/phynix-fixed-css/frontend/index.html
htdocs/phynix-fixed-css/backend/api/...
```

### Login/cadastro falhando

Verifique se:

1. Apache e MySQL estão ativos;
2. o `schema.sql` foi importado;
3. o `.env` existe;
4. as credenciais do banco estão corretas;
5. PHP está carregando `pdo_mysql`.

### Chat falhando

Confira:

- `GROQ_API_KEY` no `backend/.env`;
- `GROQ_MODEL` configurado;
- conexão com a internet do servidor;
- se o modelo configurado continua disponível na Groq.

### CORS

Se frontend e backend forem executados em origens diferentes, configure `ALLOWED_ORIGINS` no `.env` com as origens permitidas.

---

## 16. Fluxo de primeiro uso

```text
1. Abrir a aplicação
2. Criar uma conta
3. Login é criado automaticamente
4. Criar matérias no Planner
5. Registrar horas
6. Marcar conclusões diárias
7. Acompanhar calendário e streak
8. Desbloquear conquistas
9. Definir meta diária
10. Usar o EstudaAI
11. Consultar o histórico do chat
```

---

## 17. Relação com o protótipo anterior

O protótipo anterior do projeto tinha uma arquitetura mais concentrada no frontend, com módulos para planner, calendário, histórico, chat e UI, e utilizava armazenamento local do navegador.

O projeto atual mantém a ideia de **modularização do frontend**, mas transfere a persistência e as regras importantes para PHP + MySQL.

Por isso, ao incorporar elementos do protótipo, a regra é:

```text
UI / visual / componentes
        ↓
   podem ser reaproveitados

persistência / autenticação / API
        ↓
   continuam no backend atual
```

O histórico de chat, por exemplo, já possui suporte nativo no banco atual por meio de `chat_sessions` e `chat_messages`, portanto não precisa ser recriado usando `localStorage`.

---

## 18. Estado atual do projeto

A versão atual contempla:

- autenticação por sessão;
- cadastro e login;
- planner de matérias;
- registro de horas;
- conclusão diária por matéria;
- calendário de estudos;
- streak;
- conquistas;
- meta diária;
- histórico persistente de conversas;
- criação de novas conversas;
- edição de mensagens do usuário;
- exclusão de conversas;
- integração da IA via backend;
- frontend modular em CSS/JS;
- configuração por `.env`;
- `.gitignore` voltado a evitar exposição de credenciais.

---

## 19. Licença / uso

Este repositório é um projeto acadêmico. Caso uma licença específica seja adotada, ela deve ser adicionada neste arquivo.
