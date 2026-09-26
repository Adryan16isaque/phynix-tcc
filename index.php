<?php
// Redireciona a raiz do site pra dentro de frontend/, onde o app de
// verdade mora. Sem esse arquivo, acessar só o domínio (sem /frontend/
// no final) dá 403 Forbidden, porque não existe index.html na raiz.
header('Location: /frontend/');
exit;
