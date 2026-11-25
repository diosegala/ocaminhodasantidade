// Transforma a resposta do assistente em blocos (parágrafos e listas) e trechos com links
// para o Catecismo ("§ 1213", "§§ 1213-1216") e para a Bíblia ("[[Jo 3,16]]").

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "cic"; text: string; n: number }
  | { kind: "bible"; text: string; ref: string };

export type Block = { kind: "p"; parts: Inline[] } | { kind: "list"; items: Inline[][] };

const TOKEN = /\[\[([^\]\n]{2,40})\]\]|§§?\s?(\d{1,4})(?:\s?[-–]\s?(\d{1,4}))?/g;

export function parseInline(line: string): Inline[] {
  // Negrito não é usado no app; tira os asteriscos se o modelo usar mesmo assim.
  const text = line.replace(/\*\*(.+?)\*\*/g, "$1");
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1]) {
      out.push({ kind: "bible", text: m[1].trim(), ref: m[1].trim() });
    } else {
      const n = Number(m[2]);
      if (n >= 1 && n <= 2865) out.push({ kind: "cic", text: m[0], n });
      else out.push({ kind: "text", text: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

export function parseAnswer(answer: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of answer.split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((l) => l.trim());
    if (!lines.length) continue;
    let para: string[] = [];
    let items: Inline[][] = [];
    const flushPara = () => {
      if (para.length) blocks.push({ kind: "p", parts: parseInline(para.join(" ")) });
      para = [];
    };
    const flushList = () => {
      if (items.length) blocks.push({ kind: "list", items });
      items = [];
    };
    for (const line of lines) {
      const bullet = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
      if (bullet) {
        flushPara();
        items.push(parseInline(bullet[1]!));
      } else {
        flushList();
        para.push(line.trim().replace(/^#+\s*/, ""));
      }
    }
    flushPara();
    flushList();
  }
  return blocks;
}
