import { useNavigate } from "@tanstack/react-router";
import { SegmentedControl } from "@/components/app/ui";

const PATHS = {
  biblia: "/biblia",
  catecismo: "/biblia/catecismo",
  perguntar: "/biblia/perguntar",
} as const;

/** Alterna entre Bíblia, Catecismo e o assistente, dentro da aba Bíblia. */
export function StudySwitch({ value }: { value: keyof typeof PATHS }) {
  const navigate = useNavigate();
  return (
    <SegmentedControl
      options={[
        { value: "biblia", label: "Bíblia" },
        { value: "catecismo", label: "Catecismo" },
        { value: "perguntar", label: "Perguntar" },
      ]}
      value={value}
      onChange={(v) => navigate({ to: PATHS[v] })}
    />
  );
}
