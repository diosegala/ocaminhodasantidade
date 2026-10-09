import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Envia o token da sessão do navegador e exige login válido no servidor. */
export const requireAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .client(async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next(token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  });
