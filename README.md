# Barbearia Elite — Versão HTML Puro

Sistema de agendamento feito com HTML + CSS + JavaScript e Supabase. Sem instalação.

## Como rodar

1. Clone o repositório
2. Abra o arquivo `index.html` no navegador

Pronto. Não precisa instalar nada.

## Configurar o Supabase (só uma vez)

1. Acesse [supabase.com](https://supabase.com) e entre no projeto
2. Vá em **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**

## Cadastrar o barbeiro

Na tela de login:
1. Selecione **"Sou Barbeiro"**
2. Clique em **"Cadastre-se"**
3. Preencha nome, email e senha
4. No campo **"Código do barbeiro"** digite: `BARBEARIA2024`

## Credenciais padrão do Supabase

Já estão configuradas no arquivo `js/config.js`. Os colegas não precisam mudar nada.

## Estrutura

```
barbearia-html/
├── index.html       → Tela de login
├── cliente.html     → Painel do cliente
├── barbeiro.html    → Painel do barbeiro
├── js/
│   ├── config.js    → Configuração do Supabase
│   ├── login.js     → Lógica do login
│   ├── cliente.js   → Lógica do cliente
│   └── barbeiro.js  → Lógica do barbeiro
└── supabase/
    └── schema.sql   → Script do banco de dados
```
