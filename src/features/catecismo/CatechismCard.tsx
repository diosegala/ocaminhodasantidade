import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Landmark } from "lucide-react";
import { Card } from "@/components/app/ui";
import { catechismQueryOptions } from "./data";
import { catechismOfDay } from "./liturgical";

/** "Catecismo de hoje" na tela Hoje: parágrafos ligados ao tempo litúrgico. */
export function CatechismCard({ date }: { date: string }) {
  const cat = useQuery(catechismQueryOptions).data;
  if (!cat) return null;

  const day = catechismOfDay(date);
  const first = day.paragraphs[0]!;
  const last = day.paragraphs.at(-1)!;
  const chapter = cat.chapters[cat.chapterOf.get(first) ?? -1];
  const text = chapter?.paragraphs.find((p) => p.n === first)?.text;
  if (!text) return null;

  const numbers = first === last ? `§ ${first}` : `§§ ${first}–${last}`;
  const contiguous = last - first + 1 === day.paragraphs.length;

  return (
    <Link to="/biblia/catecismo" search={{ n: first }} className="pressable mt-5 block">
      <Card>
        <p className="eyebrow flex items-center gap-1.5">
          <Landmark className="h-4 w-4" /> Catecismo de hoje
        </p>
        <p className="mt-2 text-[17px] font-semibold leading-snug">{day.title || chapter.title}</p>
        <p className="reading mt-2 line-clamp-4">{text}</p>
        <p className="mt-3 flex items-center gap-1 text-[15px] text-primary">
          Ler {contiguous ? numbers : day.paragraphs.map((n) => `§ ${n}`).join(", ")}
          <ChevronRight className="h-4 w-4" />
        </p>
      </Card>
    </Link>
  );
}
