import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Milestone } from "./milestones";

/** Gaveta que celebra um marco do caminho, com uma frase bíblica. */
export function MilestoneSheet({
  milestone,
  onClose,
}: {
  milestone: Milestone;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-xl rounded-t-[28px] bg-card px-6 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-center shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-5 block h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
          <Flag className="h-8 w-8" strokeWidth={1.8} />
        </span>
        <p className="eyebrow mt-4">
          Marco do caminho ·{" "}
          {new Date(milestone.date + "T12:00:00").toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
          })}
        </p>
        <h2 className="title mt-1">{milestone.title}</h2>
        <p className="reading mt-4">“{milestone.verse}”</p>
        <p className="mt-1 text-[15px] text-muted-foreground">{milestone.reference}</p>
        <Button size="lg" className="mt-6" onClick={onClose}>
          Amém
        </Button>
      </div>
    </div>
  );
}
