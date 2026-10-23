import { ArrowRight } from "lucide-react";
import { Chip } from "@/components/app/ui";
import {
  describeReference,
  parseReference,
  suggestBooks,
  withBook,
  type BookLite,
} from "./reference";

/**
 * Embaixo de um campo de referência: mostra o trecho entendido ("→ João 15,1-8") ou,
 * se o livro não ficou claro, os livros possíveis para tocar.
 */
export function ReferenceHint({
  input,
  books,
  onChange,
}: {
  input: string;
  books: BookLite[];
  onChange: (next: string) => void;
}) {
  if (!input.trim() || books.length === 0) return null;
  const ref = parseReference(input, books);
  if (ref) {
    return (
      <p className="mt-2 flex items-center gap-1.5 px-1 text-[15px] text-primary">
        <ArrowRight className="h-4 w-4 shrink-0" /> {describeReference(ref)}
      </p>
    );
  }
  const options = suggestBooks(input, books);
  if (options.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="px-1 text-[13px] text-muted-foreground">Qual livro?</span>
      {options.map((b) => (
        <Chip key={b.id} active={false} onClick={() => onChange(withBook(input, b))}>
          {b.name}
        </Chip>
      ))}
    </div>
  );
}
