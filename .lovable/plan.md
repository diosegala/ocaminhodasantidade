# Caminho — Etapa 1: Base

Seguindo a ordem do PRD, esta etapa entrega a fundação. As próximas (Bíblia, Lectio, Aulas, Reflexões, Hoje/Busca) vêm uma por vez, depois de você testar no celular.

## O que você vai ver
- Tela de entrada com login por link no e-mail.
- App mobile first, em português do Brasil, com fonte grande de leitura, modo claro e escuro.
- Barra inferior com quatro abas: Hoje, Aulas, Bíblia, Reflexões (telas vazias, com mensagem amigável).
- Busca global no topo (só a caixa nesta etapa).
- Instalável na tela inicial do iPhone (ícone, nome "Caminho", tela cheia).

## Visual
Estilo calmo de livro de oração: fundo papel claro (e tom escuro quente no modo escuro), tipografia serifada para leitura (Literata) e sem serifa para interface (Source Sans 3), um acento litúrgico discreto (verde-oliva), muito espaço em branco.

## Banco de dados (Lovable Cloud)
Todas as tabelas do PRD criadas já agora, com `user_id` e proteção por usuário em todas:
bible_books, bible_verses (leitura para qualquer usuário logado), lessons, lesson_photos, lesson_questions, reflections, tags, taggings, bible_links, verse_marks, lectio_entries, liturgy_cache. Bucket privado para fotos das aulas. Tabelas de Pregações ficam para a fase 2.

## Pronto quando
Você entra pelo link do e-mail e navega entre as quatro abas vazias.

## Ajustes ao PRD (detalhes técnicos)
- Stack real do Lovable: TanStack Start + Tailwind + shadcn; chamadas de IA e liturgia serão funções de servidor do próprio app (não Edge Functions), com chaves sempre no servidor.
- IA: Claude via Lovable AI Gateway (sem precisar de chave própria da Anthropic). Entra na etapa 4.
- PWA: apenas manifesto + ícones (sem service worker, que atrapalha a pré-visualização).
- Rotas: /login, /hoje (início em /), /aulas, /biblia, /reflexoes, sob um layout autenticado.
