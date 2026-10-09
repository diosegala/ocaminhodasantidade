import { Link, useCanGoBack, useRouter, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, CircleUser, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Título grande da tela, no estilo do iPhone. Telas principais mostram o ícone de conta. */
export function ScreenHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Botão de voltar: volta no histórico ou, se a tela foi aberta direto, vai para `to`. */
  back?: { label: string; to: NonNullable<LinkProps["to"]> };
  action?: ReactNode;
}) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <header className="mb-5">
      <div className="flex h-10 items-center justify-between">
        {back ? (
          <button
            onClick={() =>
              canGoBack ? router.history.back() : void router.navigate({ to: back.to })
            }
            className="pressable -ml-2 flex items-center gap-0.5 rounded-full py-1 pl-1 pr-3 text-[17px] text-primary"
          >
            <ChevronLeft className="h-6 w-6" /> {back.label}
          </button>
        ) : (
          <span />
        )}
        {action ?? (back ? null : <AccountButton />)}
      </div>
      <h1 className="title-large mt-1">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-[15px] text-muted-foreground first-letter:uppercase">{subtitle}</p>
      )}
    </header>
  );
}

function AccountButton() {
  return (
    <Link
      to="/conta"
      aria-label="Minha conta"
      className="pressable -mr-1.5 rounded-full p-1.5 text-muted-foreground"
    >
      <CircleUser className="h-7 w-7" strokeWidth={1.6} />
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-[20px] bg-card p-5 shadow-card", className)}>{children}</div>;
}

/** Lista agrupada (cartão com linhas separadas), como nos Ajustes do iPhone. */
export function ListGroup({
  title,
  className,
  children,
}: {
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      {title && <h2 className="eyebrow mb-2 px-4">{title}</h2>}
      <div className="overflow-hidden rounded-[20px] bg-card shadow-card [&>*+*]:border-t">
        {children}
      </div>
    </section>
  );
}

/** Classe de uma linha tocável de ListGroup; use em <Link> ou <button> com <Row> dentro. */
export const rowClass =
  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary";

export function Row({
  icon: Icon,
  title,
  detail,
  chevron = false,
}: {
  icon?: LucideIcon | undefined;
  title: ReactNode;
  detail?: ReactNode;
  chevron?: boolean;
}) {
  return (
    <>
      {Icon && <Icon className="h-5 w-5 shrink-0 text-primary" />}
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {detail != null && (
        <span className="shrink-0 text-[15px] text-muted-foreground">{detail}</span>
      )}
      {chevron && <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60" />}
    </>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "pressable flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[15px]",
        active ? "bg-primary text-primary-foreground" : "bg-card text-foreground shadow-card",
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-10 flex flex-col items-center px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className="h-8 w-8" strokeWidth={1.6} />
      </span>
      <h2 className="title mt-4">{title}</h2>
      <p className="reading mt-2 text-muted-foreground">{children}</p>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-xl bg-secondary p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-[10px] py-2 text-[15px] transition-colors",
            value === o.value ? "bg-card font-semibold shadow-card" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
