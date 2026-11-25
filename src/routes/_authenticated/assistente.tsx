import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/app/PasswordInput";
import { Card, ListGroup, rowClass, ScreenHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import {
  deleteAiKey,
  getAiSettings,
  listAiModels,
  saveAiKey,
  saveAiModel,
} from "@/features/assistente/assistant.functions";

export const Route = createFileRoute("/_authenticated/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente de estudo — Caminho" },
      { name: "description", content: "Chave da API e modelo do assistente." },
      { property: "og:title", content: "Assistente de estudo — Caminho" },
      { property: "og:description", content: "Chave da API e modelo do assistente." },
    ],
  }),
  component: AssistentePage,
});

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Algo deu errado.");

function AssistentePage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["ai-settings"], queryFn: () => getAiSettings() });
  const hasKey = !!settings.data?.hasKey;
  const models = useQuery({
    queryKey: ["ai-models"],
    queryFn: () => listAiModels(),
    enabled: hasKey,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const [key, setKey] = useState("");

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] }),
      queryClient.invalidateQueries({ queryKey: ["ai-models"] }),
    ]);

  const save = useMutation({
    mutationFn: (k: string) => saveAiKey({ data: { key: k } }),
    onSuccess: async () => {
      setKey("");
      await refresh();
      toast.success("Chave conferida e guardada.");
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const remove = useMutation({
    mutationFn: () => deleteAiKey(),
    onSuccess: async () => {
      await refresh();
      toast.success("Chave apagada.");
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const choose = useMutation({
    mutationFn: (model: string) => saveAiModel({ data: { model } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-settings"] }),
    onError: (e) => toast.error(errorText(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (key.trim()) save.mutate(key.trim());
  }

  const current = settings.data?.model || models.data?.defaultModel;

  return (
    <section>
      <ScreenHeader title="Assistente de estudo" back={{ label: "Conta", to: "/conta" }} />

      <p className="reading -mt-2 text-muted-foreground">
        O assistente responde dúvidas consultando a Bíblia, o Catecismo e as suas aulas. Ele usa os
        modelos Claude, da Anthropic, com a sua própria chave da API: o custo vai para a sua conta
        na Anthropic.
      </p>

      <h2 className="eyebrow mb-2 mt-7 px-4">Chave da API</h2>
      <Card>
        {hasKey ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px]">
              Chave guardada, terminando em{" "}
              <span className="font-mono font-semibold">…{settings.data?.keyHint}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                if (
                  confirm(
                    "Apagar a chave? O assistente para de funcionar até você cadastrar outra.",
                  )
                )
                  remove.mutate();
              }}
              className="text-destructive"
            >
              Apagar
            </Button>
          </div>
        ) : (
          <p className="text-[15px] text-muted-foreground">
            Crie uma chave em platform.claude.com, em API Keys, e cole aqui. Ela fica criptografada
            no banco e nunca volta para o aparelho.
          </p>
        )}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <PasswordInput
            autoComplete="off"
            placeholder={hasKey ? "Trocar por outra chave" : "sk-ant-…"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <Button type="submit" size="md" disabled={save.isPending || key.trim().length < 20}>
            {save.isPending ? "Conferindo…" : "Conferir e guardar"}
          </Button>
        </form>
      </Card>

      {hasKey && (
        <ListGroup title="Modelo" className="mt-7">
          {models.isLoading ? (
            <p className="px-4 py-3.5 text-[15px] text-muted-foreground">Buscando os modelos…</p>
          ) : models.isError ? (
            <p className="px-4 py-3.5 text-[15px] text-destructive">{errorText(models.error)}</p>
          ) : (
            (models.data?.models ?? []).map((m) => (
              <button
                key={m.id}
                onClick={() => choose.mutate(m.id)}
                disabled={choose.isPending}
                className={`${rowClass} flex w-full items-center gap-3 text-left`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block">{m.name}</span>
                  <span className="block font-mono text-[12px] text-muted-foreground">{m.id}</span>
                </span>
                {m.id === current && <Check className="h-5 w-5 shrink-0 text-primary" />}
              </button>
            ))
          )}
        </ListGroup>
      )}

      <p className="mt-6 px-4 text-[13px] leading-snug text-muted-foreground">
        Privacidade: a pergunta e os trechos consultados vão para a Anthropic, que, pelas regras da
        API, não os usa para treinar modelos e os apaga em até 30 dias. O histórico das conversas
        fica só no banco do app, visível apenas para você. Modelos maiores respondem melhor e custam
        mais; os menores (Haiku) custam bem menos.
      </p>

      {hasKey && (
        <Link to="/biblia/perguntar" className="mt-6 block">
          <Button size="lg">Fazer uma pergunta</Button>
        </Link>
      )}
    </section>
  );
}
