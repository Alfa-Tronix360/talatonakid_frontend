# CLACS Escola — Frontend

Sistema de gestão escolar do Colégio Cota Lionel, construído a partir do protótipo
(`CLACS Escola — Protótipo de Gestão Escolar.html`) e da API (`api_oficial.txt`, OpenAPI 3.1).

**Stack:** Vite + React 19 + TypeScript, React Router 7, TanStack Query 5. Sem biblioteca de UI: o design
(tokens, tema claro/escuro, Figtree) vem do protótipo e está em `src/styles/app.css`.

## Arrancar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção em dist/
```

A API é configurada em `.env` (`VITE_API_BASE_URL`, por omissão `/api`):

- **Desenvolvimento:** o Vite encaminha `/api` para `https://clacs-school-backend.onrender.com` (sem CORS).
  Para outro backend: `VITE_BACKEND_URL=http://localhost:8000 npm run dev`.
- **Produção (Vercel):** `vercel.json` reescreve `/api/*` para o backend e serve o SPA.

## Módulos

| Área | Rotas |
| --- | --- |
| Direcção | `/painel`, `/alertas`, `/assistente` |
| Secretaria | `/alunos`, `/alunos/:id` (visão 360°), `/encarregados`, `/matriculas`, `/turmas`, `/academico` |
| Financeiro | `/cobrancas`, `/pagamentos`, `/refeitorio`, `/catalogo` (serviços, preços, planos, multas, descontos, métodos) |
| Pedagógico | `/avaliacoes`, `/pautas`, `/assiduidade`, `/ocorrencias`, `/registo-diario` |
| Comunicação | `/regras` (regras + modelos), `/mensagens` (comunicados + histórico) |
| Sistema | `/primavera`, `/importacao`, `/relatorios`, `/utilizadores`, `/definicoes`, `/auditoria`, `/conta` (senha + 2FA) |
| Portal do encarregado | `/portal`, `/portal/educandos/:id`, `/portal/cobrancas`, `/portal/pagamentos`, `/portal/mensagens`, `/portal/preferencias` |

Contas com perfil `encarregado` entram automaticamente no portal; as restantes na área de gestão.

## Estrutura

```
src/lib/        api.ts (cliente + token + downloads), hooks.ts (useGet/useList/useAct), data.ts, format.ts, academic.ts
src/components/ Table, FormDialog (formulários declarativos), Resource (lista+criar+editar), Modal, Auto, ui, Layout
src/pages/      uma página por módulo de gestão
src/portal/     páginas do portal do encarregado
scripts/sondar-api.mjs   recolhe amostras reais da API
```

## Formato das respostas da API

O OpenAPI **não descreve as respostas** (todas `{}`), por isso as páginas leem os campos de forma tolerante
(`pick(row, 'turma', 'turma.designacao', …)`). Em `npm run dev` cada tabela tem, no rodapé, «Dados da API
(1.º registo)» para ver o JSON real. Para afinar tudo de uma vez:

```powershell
$env:CLACS_EMAIL="o.seu@email"; $env:CLACS_SENHA="a-sua-senha"; npm run sondar
```

Gera `docs/api-amostras.json` (ignorado pelo git; só 2 itens por lista) com as respostas reais de todos os GET.
