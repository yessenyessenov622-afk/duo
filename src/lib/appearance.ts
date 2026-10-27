import { DEFAULT_SETTINGS, SETTINGS_KEY, appearanceRuntime } from "@/src/lib/customization";
import { PALETTES } from "@/src/lib/appearance-palette";
import { createAppearanceRuntime } from "@/src/lib/appearance-runtime";

export { PALETTES };
export const appearanceStyle = appearanceRuntime.style;

// Serialize the same self-contained runtime used by the provider. Only static
// application configuration is embedded; user data is read and validated locally.
export function appearanceBootstrap(): string {
  return `(function(){var runtime=(${createAppearanceRuntime.toString()})(${JSON.stringify(PALETTES)},${JSON.stringify(DEFAULT_SETTINGS)}),key=${JSON.stringify(SETTINGS_KEY)},read=function(){var value={};try{value=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}return value},apply=function(){runtime.apply(document.documentElement,read())};apply();if(window.matchMedia){window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply)}})();`;
}
