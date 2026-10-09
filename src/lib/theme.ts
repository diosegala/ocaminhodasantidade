export type ThemeMode = "system" | "light" | "dark";

// Mesma regra do themeScript em src/routes/__root.tsx: sem valor guardado = automático.
export function getThemeMode(): ThemeMode {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function setThemeMode(mode: ThemeMode) {
  try {
    if (mode === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", mode);
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
  const dark =
    mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
