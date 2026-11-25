import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ChevronRight, KeyRound, MessagesSquare, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { booksQueryOptions } from "@/features/biblia/queries";
import { formatLinkRef, parseReference, type BookLite } from "@/features/biblia/reference";
import { StudySwitch } from "@/features/catecismo/StudySwitch";
import { Card, EmptyState, ListGroup, rowClass, ScreenHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { PROSE } from "@/lib/text-fields";
import { askAssistant, getAiSettings } from "./assistant.functions";
import { parseAnswer, type Inline } from "./answer-format";

type Message = { id: string; role: string; content: string };

const settingsQueryOptions = {
  queryKey: ["ai-settings"],
  queryFn: () => getAiSettings(),
  staleTime: 60_000,
};

export function AssistantScreen({ c }: { c?: string | undefined }) {
  const settings = useQuery(settingsQueryOptions);

  return (
    <section>
      <ScreenHeader title="Perguntar" subtitle="Bíblia, Catecismo e as suas aulas" />
      <StudySwitch value="perguntar" />
      {settings.isLoading ? null : !settings.data?.hasKey ? (
        <NoKey />
      ) : c ? (
        <Conversation key={c} id={c} />
      ) : (
        <Start />
      )}
    </section>
  );
}

function NoKey() {
  return (
    <Card className="mt-6">
      <p className="eyebrow flex items-center gap-1.5">
        <Sparkles className="h-4 w-4" /> Assistente de estudo
      </p>
      <p className="reading mt-2">
        Tire dúvidas sobre a fé com respostas apoiadas na Bíblia, no Catecismo e nas aulas que você
        registrou. Para começar, cadastre a sua chave da API da Anthropic.
      </p>
      <Link to="/assistente" className="mt-4 block">
        <Button size="md">
          <KeyRound className="h-4 w-4" /> Configurar o assistente
        </Button>
      </Link>
    </Card>
  );
}

const conversationsQueryOptions = {
  queryKey: ["ai-conversations"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
};

function Start() {
  const conversations = useQuery(conversationsQueryOptions);
  return (
    <>
      <Composer conversationId={null} />
      <ListGroup title="Conversas anteriores" className="mt-7">
        {(conversations.data ?? []).length === 0 ? (
          <p className="px-4 py-3.5 text-[15px] text-muted-foreground">
            As suas perguntas ficam guardadas aqui, só para você.
          </p>
        ) : (
          conversations.data!.map((conv) => (
            <Link
              key={conv.id}
              to="/biblia/perguntar"
              search={{ c: conv.id }}
              className={`${rowClass} flex items-center gap-3`}
            >
              <MessagesSquare className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block">{conv.title}</span>
                <span className="block text-[13px] text-muted-foreground">
                  {new Date(conv.updated_at).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))
        )}
      </ListGroup>
      <PrivacyNote />
    </>
  );
}

function Conversation({ id }: { id: string }) {
  const messages = useQuery({
    queryKey: ["ai-messages", id],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("id, role, content")
        .eq("conversation_id", id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const books = useQuery(booksQueryOptions).data ?? [];

  if (messages.isLoading) return null;
  if (!messages.data?.length) {
    return (
      <EmptyState icon={MessagesSquare} title="Conversa não encontrada">
        <Link to="/biblia/perguntar" className="text-primary">
          Fazer uma nova pergunta
        </Link>
      </EmptyState>
    );
  }
  return (
    <>
      <div className="mt-5 flex items-center justify-between">
        <Link
          to="/biblia/perguntar"
          className="pressable flex items-center gap-1 text-[15px] text-primary"
        >
          <Plus className="h-4 w-4" /> Nova conversa
        </Link>
      </div>
      <Thread messages={messages.data} books={books} />
      <Composer conversationId={id} />
    </>
  );
}

function Thread({ messages, books }: { messages: Message[]; books: BookLite[] }) {
  return (
    <div className="mt-4 space-y-4">
      {messages.map((m) =>
        m.role === "user" ? (
          <p
            key={m.id}
            className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-[16px] text-primary-foreground"
          >
            {m.content}
          </p>
        ) : (
          <Card key={m.id}>
            <Answer text={m.content} books={books} />
          </Card>
        ),
      )}
    </div>
  );
}

function Answer({ text, books }: { text: string; books: BookLite[] }) {
  return (
    <div className="reading space-y-3">
      {parseAnswer(text).map((block, i) =>
        block.kind === "p" ? (
          <p key={i}>
            <Parts parts={block.parts} books={books} />
          </p>
        ) : (
          <ul key={i} className="list-disc space-y-1.5 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>
                <Parts parts={item} books={books} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

function Parts({ parts, books }: { parts: Inline[]; books: BookLite[] }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === "cic") {
          return (
            <Link key={i} to="/biblia/catecismo" search={{ n: p.n }} className="text-primary">
              {p.text}
            </Link>
          );
        }
        if (p.kind === "bible") {
          const ref = books.length ? parseReference(p.ref, books) : null;
          if (!ref) return <span key={i}>{p.text}</span>;
          return (
            <Link
              key={i}
              to="/biblia"
              search={{ ref: formatLinkRef(ref.book, ref.chapter, ref.verseStart, ref.verseEnd) }}
              className="text-primary"
            >
              {p.text}
            </Link>
          );
        }
        return <span key={i}>{p.text}</span>;
      })}
    </>
  );
}

function Composer({ conversationId }: { conversationId: string | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (q: string) => askAssistant({ data: { conversationId, question: q } }),
    onSuccess: async (res) => {
      setQuestion("");
      await queryClient.invalidateQueries({ queryKey: ["ai-messages", res.conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      if (!conversationId) {
        await navigate({ to: "/biblia/perguntar", search: { c: res.conversationId } });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não consegui perguntar agora."),
    onSettled: () => setPending(null),
  });

  useEffect(() => {
    if (pending) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [pending]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 2 || ask.isPending) return;
    if (!navigator.onLine) {
      toast.error("O assistente precisa de internet.");
      return;
    }
    setPending(q);
    ask.mutate(q);
  }

  return (
    <>
      {pending && (
        <div className="mt-4 space-y-4">
          <p className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-[16px] text-primary-foreground">
            {pending}
          </p>
          <Card>
            <p className="reading animate-pulse text-muted-foreground">
              Consultando a Bíblia, o Catecismo e as suas aulas…
            </p>
          </Card>
        </div>
      )}
      <form onSubmit={submit} className="mt-5 flex items-end gap-2">
        <textarea
          {...PROSE}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          rows={conversationId ? 2 : 3}
          disabled={ask.isPending}
          placeholder={
            conversationId
              ? "Continuar a conversa…"
              : "Sua dúvida, ex.: Por que os católicos rezam pelos mortos?"
          }
          className="min-h-[52px] flex-1 resize-none rounded-[20px] bg-card px-4 py-3 text-base shadow-card outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Perguntar"
          disabled={ask.isPending || question.trim().length < 2}
          className="h-[52px] w-[52px] shrink-0 rounded-full"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </form>
      <div ref={endRef} />
    </>
  );
}

function PrivacyNote() {
  return (
    <p className="mt-6 px-4 text-[13px] leading-snug text-muted-foreground">
      As respostas são geradas por IA e podem conter erros: confira nas fontes citadas. A pergunta e
      os trechos consultados vão para a Anthropic, que não os usa para treinar modelos e os apaga em
      até 30 dias.
    </p>
  );
}
