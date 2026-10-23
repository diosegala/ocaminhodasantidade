export type BookLite = {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  book_order: number;
  chapter_count: number;
};

export type ParsedReference = {
  book: BookLite;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
};

export function stripAccents(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Nomes populares que não começam como o nome oficial do livro.
const ALIASES: Record<string, string> = {
  apoc: "Ap",
  cantico: "Ct",
  canticos: "Ct",
  canticodoscanticos: "Ct",
  sal: "Sl",
  salmo: "Sl",
  job: "Jó",
};

// Palavras que aparecem ao escrever o nome por extenso ("Evangelho segundo São João",
// "Primeira carta aos Coríntios") e não ajudam a achar o livro.
const FILLERS = new Set([
  "evangelho",
  "segundo",
  "sao",
  "santo",
  "carta",
  "epistola",
  "livro",
  "profeta",
  "capitulo",
  "cap",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "a",
  "as",
  "ao",
  "aos",
  "o",
  "os",
]);

const ORDINALS: Record<string, string> = {
  "1": "1",
  "2": "2",
  "3": "3",
  "1a": "1",
  "2a": "2",
  "3a": "3",
  "1o": "1",
  "2o": "2",
  "3o": "3",
  i: "1",
  ii: "2",
  iii: "3",
  primeira: "1",
  primeiro: "1",
  segunda: "2",
  segundo: "2",
  terceira: "3",
  terceiro: "3",
};

/** Chave de comparação de um nome de livro: "I Coríntios" e "1 cor." viram "1corintios"/"1cor". */
function bookKey(text: string): string {
  const words = stripAccents(text)
    .replace(/[ºª°]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let ordinal = "";
  const first = words[0] ?? "";
  if (words.length > 1 && ORDINALS[first]) {
    ordinal = ORDINALS[first]!;
    words.shift();
  } else if (/^[1-3][a-z]/.test(first)) {
    // Número colado no nome: "1cor", "2tm".
    ordinal = first[0]!;
    words[0] = first.slice(1);
  }
  return ordinal + words.filter((w) => !FILLERS.has(w)).join("");
}

type BookIndex = { exact: Map<string, BookLite>; names: { key: string; book: BookLite }[] };

const indexCache = new WeakMap<BookLite[], BookIndex>();

function buildBookIndex(books: BookLite[]): BookIndex {
  const cached = indexCache.get(books);
  if (cached) return cached;
  const exact = new Map<string, BookLite>();
  const names: BookIndex["names"] = [];
  for (const book of books) {
    // Em colisões (Jó e João viram "jo"), vale o último na ordem da Bíblia: João.
    exact.set(bookKey(book.abbreviation), book);
    const key = bookKey(book.name);
    names.push({ key, book });
    exact.set(key, book);
  }
  for (const [alias, abbr] of Object.entries(ALIASES)) {
    const book = books.find((b) => b.abbreviation === abbr);
    if (book) exact.set(alias, book);
  }
  const index = { exact, names };
  indexCache.set(books, index);
  return index;
}

/** Distância de edição (letras trocadas, faltando ou sobrando). */
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

/** Abreviação escrita igualzinha, com acento: "Jó" é Jó, mesmo que "jo" seja João. */
function literalAbbreviation(text: string, books: BookLite[]): BookLite | undefined {
  const t = text.trim().replace(/\.$/, "").replace(/\s+/g, "").toLowerCase();
  return books.find((b) => b.abbreviation.toLowerCase() === t);
}

/**
 * Livros que podem ser o que a pessoa escreveu, do mais provável ao menos.
 * `sure` diz se o primeiro é a resposta sem dúvida.
 */
function bookCandidates(key: string, books: BookLite[]): { books: BookLite[]; sure: boolean } {
  if (!key) return { books: [], sure: false };
  const { exact, names } = buildBookIndex(books);
  const hit = exact.get(key);
  if (hit) return { books: [hit], sure: true };
  // Começo do nome: "mat" → Mateus, "1cor" → 1 Coríntios; "cor" → 1 ou 2 Coríntios.
  for (const strip of [false, true]) {
    const prefixed = names
      .filter((n) => (strip ? n.key.replace(/^\d/, "") : n.key).startsWith(key))
      .map((n) => n.book);
    if (prefixed.length) return { books: prefixed, sure: prefixed.length === 1 };
  }
  // Erros de digitação ("mateos", "jao", "genisis"): o nome mais parecido, se for claro.
  const tolerance = key.length <= 3 ? 1 : key.length <= 6 ? 2 : 3;
  const scored = names
    .map((n) => ({
      book: n.book,
      d: Math.min(editDistance(key, n.key), editDistance(key, n.key.slice(0, key.length))),
    }))
    .filter((c) => c.d <= tolerance)
    .sort((x, y) => x.d - y.d || x.book.book_order - y.book.book_order);
  return {
    books: scored.map((c) => c.book),
    sure: scored.length > 0 && (scored.length === 1 || scored[0]!.d < scored[1]!.d),
  };
}

/** Separa "1 João 3,16" em livro ("1 João") e números ("3,16"). */
function splitInput(input: string): { book: string; numbers: string } {
  const text = stripAccents(input)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ");
  // O número inicial é do livro ("1 Jo", "2Tm"); os números depois das letras são a citação.
  const m = text.match(/^((?:[1-3][ºª°]?\s*)?[^\d]*)(.*)$/)!;
  return { book: m[1]!.trim(), numbers: m[2]!.trim() };
}

const RANGE = /^\s*(?:-|a|ao|ate)\s*$/;

/** "15,1-8", "15:1 a 8", "15 1", "cap 15 vers 1 ao 8" → capítulo e versículos. */
function parseNumbers(text: string) {
  const cleaned = text.replace(/\b(capitulos?|cap|versiculos?|vers|vv?)\b\.?/g, " ");
  const nums = [...cleaned.matchAll(/\d{1,3}/g)];
  if (!nums.length) return null;
  const chapter = Number(nums[0]![0]);
  if (nums.length === 1) return { chapter, verseStart: null, verseEnd: null };
  const verseStart = Number(nums[1]![0]);
  let verseEnd = verseStart;
  if (nums[2]) {
    const between = cleaned.slice(nums[1]!.index! + nums[1]![0].length, nums[2].index);
    const end = Number(nums[2][0]);
    if (RANGE.test(between) && end > verseStart) verseEnd = end;
  }
  return { chapter, verseStart, verseEnd };
}

/**
 * Interpreta referências escritas de muitos jeitos: "2Tm 3,14-17", "João 3:16",
 * "joao 3 16", "1 cor 13", "Primeira carta aos Coríntios 13, 4 a 7", "mateos 5".
 */
export function parseReference(input: string, books: BookLite[]): ParsedReference | null {
  const { book: bookText, numbers } = splitInput(input);
  const rawBook = input.match(/^\s*((?:[1-3]\s*)?[^\d]*)/)![1]!;
  const parsed = parseNumbers(numbers);
  if (!parsed) return null;
  // Só aceita quando não há dúvida sobre o livro; senão, as sugestões ajudam a escolher.
  const { books: candidates, sure } = bookCandidates(bookKey(bookText), books);
  const book = literalAbbreviation(rawBook, books) ?? (sure ? candidates[0]! : null);
  if (!book) return null;
  if (parsed.chapter < 1 || parsed.chapter > book.chapter_count) return null;
  return { book, ...parsed };
}

/** Só o livro, sem capítulo ("joão", "salmos"), para abrir a lista de capítulos. */
export function parseBook(input: string, books: BookLite[]): BookLite | null {
  const { book, numbers } = splitInput(input);
  if (numbers) return null;
  const { books: candidates, sure } = bookCandidates(bookKey(book), books);
  return sure ? candidates[0]! : null;
}

/** Livros parecidos com o que foi escrito, para a pessoa tocar e completar. */
export function suggestBooks(input: string, books: BookLite[], limit = 4): BookLite[] {
  const key = bookKey(splitInput(input).book);
  if (key.replace(/^\d/, "").length < 2) return [];
  return bookCandidates(key, books).books.slice(0, limit);
}

/** Troca o livro escrito pelo escolhido, mantendo capítulo e versículos: "cor 13" → "1Cor 13". */
export function withBook(input: string, book: BookLite): string {
  const { numbers } = splitInput(input);
  return numbers ? `${book.abbreviation} ${numbers}` : `${book.abbreviation} `;
}

/** Nome por extenso de uma referência reconhecida: "João 15,1-8". */
export function describeReference(ref: ParsedReference): string {
  const verses = ref.verseStart
    ? `,${ref.verseStart}${ref.verseEnd && ref.verseEnd !== ref.verseStart ? `-${ref.verseEnd}` : ""}`
    : "";
  return `${ref.book.name} ${ref.chapter}${verses}`;
}

export function formatRef(
  book: { abbreviation: string },
  chapter: number,
  verse: number,
  verseEnd?: number | null,
): string {
  return verseEnd && verseEnd !== verse
    ? `${book.abbreviation} ${chapter},${verse}-${verseEnd}`
    : `${book.abbreviation} ${chapter},${verse}`;
}

/** Referência de um trecho ligado; sem versículo inicial, vale o capítulo inteiro. */
export function formatLinkRef(
  book: { abbreviation: string },
  chapter: number,
  verseStart: number | null,
  verseEnd: number | null,
): string {
  return verseStart
    ? formatRef(book, chapter, verseStart, verseEnd)
    : `${book.abbreviation} ${chapter}`;
}
