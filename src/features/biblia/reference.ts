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

const ALIASES: Record<string, string> = {
  atos: "At",
  salmo: "Sl",
  salmos: "Sl",
  sal: "Sl",
  cantico: "Ct",
  apocalipse: "Ap",
  apoc: "Ap",
  job: "Jó",
  genesis: "Gn",
  exodo: "Ex",
  levitico: "Lv",
  numeros: "Nm",
  deuteronomio: "Dt",
  proverbios: "Pr",
  eclesiastes: "Ecl",
  sabedoria: "Sb",
  isaias: "Is",
  jeremias: "Jr",
  lamentacoes: "Lm",
  ezequiel: "Ez",
  miqueias: "Mq",
  oseias: "Os",
  amos: "Am",
  ageu: "Ag",
  zacarias: "Zc",
  malaquias: "Ml",
  mateus: "Mt",
  marcos: "Mc",
  lucas: "Lc",
  joao: "Jo",
  romanos: "Rm",
  galatas: "Gl",
  efesios: "Ef",
  filipenses: "Fl",
  colossenses: "Cl",
  hebreus: "Hb",
  tiago: "Tg",
  judas: "Jd",
  marcos2: "Mc",
};

function buildBookIndex(books: BookLite[]): Map<string, BookLite> {
  const index = new Map<string, BookLite>();
  for (const book of books) {
    const abbr = stripAccents(book.abbreviation);
    const name = stripAccents(book.name);
    index.set(abbr, book);
    index.set(name, book);
    index.set(name.replace(/\s+/g, ""), book);
  }
  // aliases por último, para não sobrescrever chaves oficiais
  for (const [alias, abbr] of Object.entries(ALIASES)) {
    const book = books.find((b) => b.abbreviation === abbr);
    if (book) index.set(alias, book);
  }
  return index;
}

/** Interpreta referências como "2Tm 3,14-17", "João 3", "Sl 23,1". */
export function parseReference(input: string, books: BookLite[]): ParsedReference | null {
  const normalized = stripAccents(input).replace(/\s+/g, " ");
  const match = normalized.match(
    /^([1-3]?\s?[a-z]+)\.?\s*(\d{1,3})(?:\s*[,;:.]\s*(\d{1,3}))?(?:\s*(?:-|\u2013|a)\s*(\d{1,3}))?$/,
  );
  if (!match) return null;
  const bookKey = match[1].replace(/\s+/g, "").replace(/\.$/, "");
  const index = buildBookIndex(books);
  const book = index.get(bookKey);
  if (!book) return null;
  const chapter = Number(match[2]);
  if (chapter < 1 || chapter > book.chapter_count) return null;
  const verseStart = match[3] ? Number(match[3]) : null;
  const verseEnd = match[4] ? Number(match[4]) : verseStart;
  return { book, chapter, verseStart, verseEnd };
}

export function formatRef(book: { abbreviation: string }, chapter: number, verse: number, verseEnd?: number | null): string {
  return verseEnd && verseEnd !== verse
    ? `${book.abbreviation} ${chapter},${verse}-${verseEnd}`
    : `${book.abbreviation} ${chapter},${verse}`;
}
