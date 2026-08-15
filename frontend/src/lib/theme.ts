export const THEME_STORAGE_KEY = "interviewanvil-theme";

export type Theme = "dark" | "light";

export function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export const THEME_INIT_SCRIPT = `(() => {try {const t = localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.classList.toggle("dark", t !== "light");} catch (e) {document.documentElement.classList.add("dark");}})();`;
