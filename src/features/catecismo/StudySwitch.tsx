import { useNavigate } from "@tanstack/react-router";
import { SegmentedControl } from "@/components/app/ui";

/** Alterna entre Bíblia e Catecismo, dentro da aba Bíblia. */
export function StudySwitch({ value }: { value: "biblia" | "catecismo" }) {
  const navigate = useNavigate();
  return (
    <SegmentedControl
      options={[
        { value: "biblia", label: "Bíblia" },
        { value: "catecismo", label: "Catecismo" },
      ]}
      value={value}
      onChange={(v) => navigate({ to: v === "biblia" ? "/biblia" : "/biblia/catecismo" })}
    />
  );
}
