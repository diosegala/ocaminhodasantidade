import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireAuth } from "@/lib/require-auth";

export type Person = {
  id: string;
  email: string;
  name: string;
  isOwner: boolean;
  mustChangePassword: boolean;
  lastSignInAt: string | null;
  /** Só quantidade e data: o dono vê se a pessoa está usando, nunca o que ela escreveu. */
  activity: { lectios: number; lastLectio: string | null; lessons: number };
};

type AuthContext = { userId: string; supabase: SupabaseClient<Database> };

/** Só o dono do app gerencia as contas. Checado no servidor, com o token de quem chamou. */
async function assertOwner(context: AuthContext) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "owner",
  });
  if (error || !data) throw new Error("Apenas o dono do app pode fazer isso.");
}

const password = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.");

function friendly(message: string) {
  if (message.includes("already been registered")) return "Já existe uma conta com este e-mail.";
  if (message.includes("EMAIL_NOT_ALLOWED")) return "Este e-mail não está liberado.";
  return message;
}

export const listPeople = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<Person[]> => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: users, error }, { data: roles }, { data: lectios }, { data: lessons }] =
      await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("lectio_entries").select("user_id, date"),
        supabaseAdmin.from("lessons").select("user_id"),
      ]);
    if (error) throw new Error(error.message);
    const activity = new Map<string, Person["activity"]>();
    const activityOf = (id: string) => {
      if (!activity.has(id)) activity.set(id, { lectios: 0, lastLectio: null, lessons: 0 });
      return activity.get(id)!;
    };
    for (const l of lectios ?? []) {
      const a = activityOf(l.user_id);
      a.lectios++;
      if (!a.lastLectio || l.date > a.lastLectio) a.lastLectio = l.date;
    }
    for (const l of lessons ?? []) activityOf(l.user_id).lessons++;
    const owners = new Set((roles ?? []).filter((r) => r.role === "owner").map((r) => r.user_id));
    return users.users
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        name: (u.user_metadata?.["name"] as string | undefined) ?? u.email?.split("@")[0] ?? "",
        isOwner: owners.has(u.id),
        mustChangePassword: !!u.user_metadata?.["must_change_password"],
        lastSignInAt: u.last_sign_in_at ?? null,
        activity: activity.get(u.id) ?? { lectios: 0, lastLectio: null, lessons: 0 },
      }))
      .sort(
        (a, b) => Number(b.isOwner) - Number(a.isOwner) || a.name.localeCompare(b.name, "pt-BR"),
      );
  });

export const addPerson = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(1, "Escreva o nome."),
        email: z.string().trim().toLowerCase().email("E-mail inválido."),
        password,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // O cadastro é travado no banco por allowed_emails; libera o e-mail antes de criar a conta.
    const allowed = await supabaseAdmin
      .from("allowed_emails")
      .upsert({ email: data.email, invited_by: context.userId });
    if (allowed.error) throw new Error(allowed.error.message);
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, must_change_password: true },
    });
    if (error) throw new Error(friendly(error.message));
    return { ok: true };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), password }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    if (data.userId === context.userId)
      throw new Error("Para a sua própria senha, use Conta → Alterar senha.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
      user_metadata: { must_change_password: true },
    });
    if (error) throw new Error(friendly(error.message));
    return { ok: true };
  });
