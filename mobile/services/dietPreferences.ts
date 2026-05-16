import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Dish } from "./api";

const STORAGE_KEY = "diet_preferences_v1";

export const CALORIE_STEPS = [1, 5, 10, 50, 100] as const;


export function macroCaloriesFromGrams(proteinG: number, carbG: number, fatG: number): number {
  return 4 * proteinG + 4 * carbG + 9 * fatG;
}


export const MEAL_CAL_MIN = 0;
export const MEAL_CAL_MAX = 3000;

export function clampMealCalories(cal: number): number {
  return Math.min(MEAL_CAL_MAX, Math.max(MEAL_CAL_MIN, cal));
}

export type DietPreference = {
  targetCalories: number;
  calorieStep: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  dietType: string;
  mealType: string;
  likes: string[];
  dislikes: string[];
};

export const DEFAULT_DIET_PREFERENCE: DietPreference = {
  targetCalories: 638,
  calorieStep: 1,
  proteinG: 48,
  carbG: 8,
  fatG: 46,
  dietType: "none",
  mealType: "none",
  likes: [],
  dislikes: [],
};


export function alignMacrosToTargetCalories(p: DietPreference): DietPreference {
  const t = clampMealCalories(p.targetCalories);
  const k = macroCaloriesFromGrams(p.proteinG, p.carbG, p.fatG);
  if (k <= 0) {
    const d = DEFAULT_DIET_PREFERENCE;
    const dk = macroCaloriesFromGrams(d.proteinG, d.carbG, d.fatG);
    const s = dk > 0 ? t / dk : 1;
    return {
      ...p,
      targetCalories: t,
      proteinG: Math.round(d.proteinG * s),
      carbG: Math.round(d.carbG * s),
      fatG: Math.round(d.fatG * s),
    };
  }
  const s = t / k;
  return {
    ...p,
    targetCalories: t,
    proteinG: Math.round(p.proteinG * s),
    carbG: Math.round(p.carbG * s),
    fatG: Math.round(p.fatG * s),
  };
}


export function syncCaloriesWithMacrosAfterMacroEdit(p: DietPreference): DietPreference {
  const k = macroCaloriesFromGrams(p.proteinG, p.carbG, p.fatG);
  if (k <= 0) {
    return alignMacrosToTargetCalories({ ...p, targetCalories: MEAL_CAL_MIN });
  }
  if (k < MEAL_CAL_MIN || k > MEAL_CAL_MAX) {
    const t = clampMealCalories(k);
    const s = t / k;
    return {
      ...p,
      proteinG: Math.round(p.proteinG * s),
      carbG: Math.round(p.carbG * s),
      fatG: Math.round(p.fatG * s),
      targetCalories: Math.round(t),
    };
  }
  return { ...p, targetCalories: Math.round(k) };
}

export function normalizeLoadedDietPreference(p: DietPreference): DietPreference {
  return alignMacrosToTargetCalories(p);
}

export function scoreDishForPreferences(d: Dish, p: DietPreference): number {
    const calT = Math.max(p.targetCalories, 1);
    const dc = d.calories ?? 0;
    const calScore = 1 - Math.min(1, Math.abs(dc - calT) / calT);
    return calScore * 100;
}

export const DIET_OPTIONS = [
  { id: "none", label: "No preference" },
  { id: "keto", label: "Keto" },
  { id: "carnivore", label: "Carnivore" },
  { id: "vegan", label: "Vegan" },
  { id: "paleo", label: "Paleo" },
  { id: "lowcarb", label: "Low carb" },
] as const;

export const MEAL_OPTIONS = [
  { id: "none", label: "No preference" },
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snack" },
] as const;

export async function loadDietPreferences(): Promise<DietPreference> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DIET_PREFERENCE };
    const parsed = JSON.parse(raw) as Partial<DietPreference>;
    const stepOk =
      typeof parsed.calorieStep === "number" &&
      (CALORIE_STEPS as readonly number[]).includes(parsed.calorieStep);
    const merged: DietPreference = {
      ...DEFAULT_DIET_PREFERENCE,
      ...parsed,
      calorieStep: stepOk ? parsed.calorieStep! : DEFAULT_DIET_PREFERENCE.calorieStep,
      likes: Array.isArray(parsed.likes) ? parsed.likes : [],
      dislikes: Array.isArray(parsed.dislikes) ? parsed.dislikes : [],
    };
    return normalizeLoadedDietPreference(merged);
  } catch {
    return { ...DEFAULT_DIET_PREFERENCE };
  }
}

export async function saveDietPreferences(p: DietPreference): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export async function clearDietPreferences(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
