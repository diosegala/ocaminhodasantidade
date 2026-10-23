import { createFileRoute } from "@tanstack/react-router";

// Chamado a cada hora cheia pelo agendamento do banco (supabase/push_cron.sql).
export const Route = createFileRoute("/api/push/diario")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PUSH_CRON_SECRET"];
        if (!secret || request.headers.get("x-cron-secret") !== secret) {
          return new Response("Não autorizado", { status: 401 });
        }
        const { sendDailyPushes } = await import("@/features/avisos/push.server");
        try {
          return Response.json(await sendDailyPushes());
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
