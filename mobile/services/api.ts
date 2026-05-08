import Constants from "expo-constants";
function inferLanApiBase(): string {
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
    (Constants as unknown as {
      manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
    }).manifest2?.extra?.expoClient?.hostUri ??
    "";

  const host = hostUri.split(":")[0]?.trim();
  if (!host) {
    throw new Error(
      "Не удалось определить IP"
    );
  }
  return `http://${host}:8000`;
}
const API_BASE = __DEV__ ? inferLanApiBase() : "https://your-production-url.com";
export const API_BASE_URL = API_BASE;


export interface Restaurant {
  id: number;
  name: string;
}

export interface Dish {
  id: number;
  dish_name: string;
  restaurant?: string;
  description?: string;
  price?: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

export interface NutritionResult {
  dish_name: string;
  restaurant_name: string;
  price?: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

export async function fetchRestaurants(
  query?: string
): Promise<{ results: Restaurant[] }> {
  const url = query
    ? `${API_BASE}/restaurants?query=${encodeURIComponent(query)}`
    : `${API_BASE}/restaurants`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load restaurants");
  return res.json();
}

export async function fetchDishes(
  restaurantId: number
): Promise<{ results: Dish[] }> {
  const res = await fetch(
    `${API_BASE}/dishes?restaurant_id=${restaurantId}&limit=300`
  );
  if (!res.ok) throw new Error("Failed to load dishes");
  return res.json();
}

export async function saveUserRestaurant(
  userId: string,
  restaurantId: number
): Promise<void> {
  const res = await fetch(`${API_BASE}/user/restaurant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, restaurant_id: restaurantId }),
  });
  if (!res.ok) throw new Error("Failed to save restaurant");
}

export async function saveUserDish(
  userId: string,
  dishId: number
): Promise<void> {
  const res = await fetch(`${API_BASE}/user/dish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, dish_id: dishId }),
  });
  if (!res.ok) throw new Error("Failed to save dish");
}

export async function getUserResult(userId: string): Promise<NutritionResult> {
  const res = await fetch(
    `${API_BASE}/user/result?user_id=${encodeURIComponent(userId)}`
  );
  if (!res.ok) throw new Error("Failed to fetch result");
  return res.json();
}
