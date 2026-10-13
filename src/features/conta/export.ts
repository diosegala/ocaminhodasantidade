import { supabase } from "@/integrations/supabase/client";
import { formatLinkRef } from "@/features/biblia/reference";

// Cópia de segurança dos textos da pessoa, em Markdown (texto simples legível em
// qualquer lugar). O plano gratuito do Supabase não guarda backups automáticos.

const LECTIO_STEPS = [
  ["reading_mark", "Leitura"],
  ["meditation", "Meditação"],
  ["prayer", "Oração"],
  ["contemplation", "Contemplação"],
] as const;

function longDate(date: string) {
  return new Date(date.length === 10 ? date + "T12:00:00" : date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function all<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function buildExport(): Promise<string> {
  const [lectios, reflections, tags, taggings, links, marks, books] = await Promise.all([
    all(
      supabase
        .from("lectio_entries")
        .select("date, reference, reading_mark, meditation, prayer, contemplation, completed_at")
        .order("date", { ascending: false }),
    ),
    all(
      supabase
        .from("reflections")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false }),
    ),
    all(supabase.from("tags").select("id, name")),
    all(supabase.from("taggings").select("tag_id, source_id").eq("source_type", "reflexao")),
    all(
      supabase
        .from("bible_links")
        .select("source_id, book_id, chapter, verse_start, verse_end")
        .eq("source_type", "reflexao"),
    ),
    all(
      supabase
        .from("verse_marks")
        .select("book_id, chapter, verse, highlight, note")
        .order("book_id")
        .order("chapter")
        .order("verse"),
    ),
    all(supabase.from("bible_books").select("id, name, abbreviation")),
  ]);

  const bookById = new Map(books.map((b) => [b.id, b]));
  const tagName = new Map(tags.map((t) => [t.id, t.name]));
  const out: string[] = [
    "# Caminho — meus textos",
    "",
    `Exportado em ${longDate(new Date().toISOString())}.`,
    "",
  ];

  out.push("## Lectios", "");
  if (!lectios.length) out.push("_Nenhuma lectio ainda._", "");
  for (const l of lectios) {
    out.push(
      `### ${longDate(l.date)}${l.reference ? ` · ${l.reference}` : ""}${l.completed_at ? "" : " (em andamento)"}`,
      "",
    );
    let wrote = false;
    for (const [key, label] of LECTIO_STEPS) {
      const text = l[key]?.trim();
      if (!text) continue;
      out.push(`**${label}:** ${text}`, "");
      wrote = true;
    }
    if (!wrote) out.push("_Rezada em silêncio, sem anotações._", "");
  }

  out.push("## Reflexões", "");
  if (!reflections.length) out.push("_Nenhuma reflexão ainda._", "");
  for (const r of reflections) {
    out.push(`### ${r.title.trim() || "Sem título"}`, "");
    const meta = [`criada em ${longDate(r.created_at)}`];
    const rTags = taggings.filter((t) => t.source_id === r.id).map((t) => tagName.get(t.tag_id));
    if (rTags.length) meta.push(`temas: ${rTags.filter(Boolean).join(", ")}`);
    const refs = links
      .filter((l) => l.source_id === r.id)
      .map((l) => {
        const book = bookById.get(l.book_id);
        return book ? formatLinkRef(book, l.chapter, l.verse_start, l.verse_end) : "";
      })
      .filter(Boolean);
    if (refs.length) meta.push(`versículos: ${refs.join("; ")}`);
    out.push(`_${meta.join(" · ")}_`, "", r.body.trim() || "_(sem texto)_", "");
  }

  out.push("## Destaques e notas na Bíblia", "");
  const marked = marks.filter((m) => m.note?.trim() || m.highlight);
  if (!marked.length) out.push("_Nenhum versículo marcado ainda._", "");
  for (const m of marked) {
    const book = bookById.get(m.book_id);
    const ref = book ? `${book.name} ${m.chapter},${m.verse}` : `${m.chapter},${m.verse}`;
    const hl = m.highlight ? ` (destaque ${m.highlight})` : "";
    out.push(`- **${ref}**${hl}${m.note?.trim() ? `: ${m.note.trim()}` : ""}`);
  }
  out.push("");

  return out.join("\n");
}

/** Abre a folha de compartilhar do iPhone (salvar em Arquivos, e-mail…), ou baixa o arquivo. */
export async function shareExport(markdown: string) {
  const name = `caminho-meus-textos-${new Date().toISOString().slice(0, 10)}.md`;
  const file = new File([markdown], name, { type: "text/plain" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Caminho — meus textos" });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // a pessoa fechou a folha
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
