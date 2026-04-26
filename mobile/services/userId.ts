import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "nutrition_user_id";

function generateId(): string {
  const chars = "abcdef0123456789";
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map((len) =>
      Array.from({ length: len }, () =>
        chars[Math.floor(Math.random() * chars.length)],
      ).join(""),
    )
    .join("-");
}

let cached: string | null = null;

export async function getUserId(): Promise<string> {
  if (cached) return cached;
  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    id = generateId();
    await AsyncStorage.setItem(KEY, id);
  }
  cached = id;
  return id;
}
