const API_BASE = __DEV__
  ? "http://192.168.0.16:8000" // your Mac's local IP; update if it changes
  : "https://your-production-url.com";

export interface Restaurant {
  id: number;
  name: string;
}

export interface Dish {
  id: number;
  dish_name: string;
  restaurant: string;
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

export async function searchDishes(
  query: string,
  restaurant?: string,
): Promise<{ results: Dish[] }> {
  const params = new URLSearchParams({ query });
  if (restaurant) params.append("restaurant", restaurant);
  const res = await fetch(`${API_BASE}/dishes/search?${params}`);
  if (!res.ok) throw new Error("Ошибка поиска");
  return res.json();
}

export async function fetchRestaurants(
  query?: string,
): Promise<{ results: Restaurant[] }> {
  const url = query
    ? `${API_BASE}/restaurants?query=${encodeURIComponent(query)}`
    : `${API_BASE}/restaurants`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Ошибка загрузки ресторанов");
  return res.json();
}

export async function fetchDishes(
  restaurantId: number,
): Promise<{ results: Dish[] }> {
  const res = await fetch(
    `${API_BASE}/dishes?restaurant_id=${restaurantId}&limit=300`,
  );
  if (!res.ok) throw new Error("Ошибка загрузки блюд");
  return res.json();
}

export async function saveUserRestaurant(
  userId: string,
  restaurantId: number,
): Promise<void> {
  const res = await fetch(`${API_BASE}/user/restaurant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, restaurant_id: restaurantId }),
  });
  if (!res.ok) throw new Error("Ошибка сохранения ресторана");
}

export async function saveUserDish(
  userId: string,
  dishId: number,
): Promise<void> {
  const res = await fetch(`${API_BASE}/user/dish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, dish_id: dishId }),
  });
  if (!res.ok) throw new Error("Ошибка сохранения блюда");
}

export async function getUserResult(
  userId: string,
): Promise<NutritionResult> {
  const res = await fetch(
    `${API_BASE}/user/result?user_id=${encodeURIComponent(userId)}`,
  );
  if (!res.ok) throw new Error("Ошибка запроса");
  return res.json();
}
