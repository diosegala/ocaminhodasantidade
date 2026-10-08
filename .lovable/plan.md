# Caminho — Etapa 1: Base (nova PRD)

Seguindo a ordem da PRD, esta etapa entrega só a fundação. As próximas (Bíblia, Lectio, Aulas, Reflexões, Hoje/Busca) vêm uma por vez, depois que você testar no celular.

## Antes de começar (precisa de você)
Conectar o seu projeto Supabase: Configurações do projeto → Conectores → Supabase. Ainda não há nenhum conectado, e eu não consigo fazer isso pelo chat. O Lovable Cloud não será usado.

## O que você vai ver
- Tela de entrada com e-mail e senha, "Esqueci minha senha" e tela para criar nova senha.
- Cadastro fechado: só e-mails liberados conseguem criar conta (aparece uma mensagem clara para os outros).
- App mobile first, em português do Brasil, fonte grande de leitura, modo claro e escuro.
- Barra inferior com Hoje, Aulas, Bíblia e Reflexões (telas vazias com mensagem amigável) e busca no topo (só a caixa por enquanto).
- Botão de sair.
- Instalável na tela inicial do iPhone (ícone, nome "Caminho", tela cheia).

## Visual
Estilo calmo de livro de oração: fundo cor de papel (tom escuro quente no modo escuro), letra serifada para leitura (Literata) e sem serifa para a interface (Source Sans 3), um acento verde-oliva discreto, muito espaço em branco.

## Banco de dados (no seu Supabase, por migrations SQL)
- Tabelas pessoais, cada uma com `user_id` e regra "cada pessoa vê só o que é dela": profiles, lessons, lesson_photos, lesson_questions, reflections, tags, taggings, bible_links, verse_marks, lectio_entries, ai_usage.
- Compartilhadas e só de leitura para quem está logado: bible_books, bible_verses (com campo `tem_nota`), liturgy_cache.
- allowed_emails: lista de e-mails liberados; uma regra no cadastro recusa quem não está nela. Você adiciona e-mails pelo painel do Supabase.
- Perfil criado automaticamente no cadastro (o primeiro como "dono").
- Bucket privado de fotos, com pastas por usuário.
- Tabelas de Pregações ficam para a fase 2.

## Pronto quando
Você cria a conta com um e-mail liberado, entra e navega entre as quatro abas vazias.

## Detalhes técnicos
- O app usa TanStack Start, que tem servidor próprio. Recomendo que as chamadas de IA e de liturgia (etapas 3 e 4) sejam funções de servidor do app, em vez de Edge Functions; a chave do Claude continua guardada como segredo, nunca no navegador. Se preferir Edge Functions no Supabase como na PRD, me avise.
- IA: API do Claude com a sua chave da Anthropic, pedida só na etapa 4.
- Bloqueio de cadastro: trigger `before insert` em `auth.users` checando `allowed_emails`.
- PWA: só manifesto e ícones (sem service worker, que atrapalha a pré-visualização).
- Rotas: /auth, /reset-password, e sob o layout protegido: /hoje (início), /aulas, /biblia, /reflexoes.
