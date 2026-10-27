import { DEFAULT_SETTINGS, SETTINGS_KEY, appearanceRuntime } from "@/src/lib/customization";
import { PALETTES } from "@/src/lib/appearance-palette";
import { createAppearanceRuntime } from "@/src/lib/appearance-runtime";

export { PALETTES };
export const appearanceStyle = appearanceRuntime.style;

// Serialize the same self-contained runtime used by the provider. Only static
// application configuration is embedded; user data is read and validated locally.
export function appearanceBootstrap(): string {
  return `(function(){var runtime=(${createAppearanceRuntime.toString()})(${JSON.stringify(PALETTES)},${JSON.stringify(DEFAULT_SETTINGS)}),value={};try{value=JSON.parse(localStorage.getItem(${JSON.stringify(SETTINGS_KEY)})||'{}')}catch(e){}runtime.apply(document.documentElement,value)})();`;
}
