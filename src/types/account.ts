import type { CustomizationSettings } from "@/src/types/customization";
import type { LearningProgress } from "@/src/types/learning";

export type AccountPreferences = {
  favoriteLooks: { name: string; settings: CustomizationSettings }[];
  mapFilter: string;
  distractionFree: boolean;
};

export type AccountData = {
  progress: LearningProgress;
  settings: CustomizationSettings;
  revision: number;
  preferences: AccountPreferences;
};

export type AccountDataUpdate = {
  revision: number;
  progress?: LearningProgress;
  settings?: CustomizationSettings;
  preferences?: AccountPreferences;
  /** Reset is an explicit, revision-checked operation, never inferred from empty IDs. */
  resetProgress?: boolean;
};

export type GuestDataImport = {
  progress: LearningProgress;
  settings: CustomizationSettings;
  importId: string;
  useGuestSettings: boolean;
  preferences?: AccountPreferences;
};
