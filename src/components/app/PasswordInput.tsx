import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

/** Campo de senha com botão para mostrar ou esconder o que foi digitado. */
export function PasswordInput({
  defaultVisible = false,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { defaultVisible?: boolean }) {
  const [visible, setVisible] = useState(defaultVisible);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`w-full rounded-xl border bg-card py-3.5 pl-4 pr-12 text-base outline-none focus:ring-2 focus:ring-ring ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Esconder senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground"
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}
