<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md

- Backend is the user's own external Supabase project, never Lovable Cloud — the user wants full control of their data.
- Signed-in pages live under `src/routes/_authenticated/` (home is `_authenticated/index.tsx`, no top-level index) — one gate protects every tab.
- Signup is closed via a `before insert` trigger on `auth.users` checking `public.allowed_emails` — invite-only access enforced in the database.
- Roles live in `public.user_roles` (enum `app_role`), never on profiles — avoids privilege escalation.
- Every personal table has `user_id default auth.uid()` and an own-rows RLS policy; Bible and liturgy tables are shared read-only — the app is ready for multiple people.
- Lesson photos go in private bucket `lesson-photos` under `{user_id}/...` — storage policies match the first folder to the user.
- AI and liturgy calls will be TanStack server functions, not Edge Functions — the stack has its own server and keeps keys server-side.
