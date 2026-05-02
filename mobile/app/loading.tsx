import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { colors } from "../constants/theme";
import { getUserId } from "../services/userId";
import * as api from "../services/api";

export default function LoadingScreen() {
  const router = useRouter();
  const { restaurantId, restaurantName } = useLocalSearchParams<{
    restaurantId?: string;
    restaurantName?: string;
  }>();
  const [progress, setProgress] = useState(5);
  const [status, setStatus] = useState("Готовим персональное меню…");

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function run() {
      if (!restaurantId || !restaurantName) {
        router.replace("/");
        return;
      }

      timer = setInterval(() => {
        setProgress((p) => (p < 92 ? p + 3 : p));
      }, 120);

      try {
        const userId = await getUserId();
        setStatus("Сохраняем ресторан…");
        await api.saveUserRestaurant(userId, Number(restaurantId));

        setStatus("Загружаем меню…");
        await api.fetchDishes(Number(restaurantId));

        if (!mounted) return;
        setProgress(100);
        setStatus("Готово");
        setTimeout(() => {
          router.replace({
            pathname: "/restaurant/[id]",
            params: { id: restaurantId, name: restaurantName },
          });
        }, 250);
      } catch {
        if (!mounted) return;
        setStatus("Не удалось подготовить меню. Попробуй снова.");
      } finally {
        if (timer) clearInterval(timer);
      }
    }

    void run();

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [restaurantId, restaurantName, router]);

  return (
    <>
      <Stack.Screen options={{ title: "Загрузка" }} />
      <View style={styles.container}>
        <Text style={styles.percent}>{progress}%</Text>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.status}>{status}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  percent: {
    color: colors.text,
    fontSize: 46,
    fontWeight: "800",
    marginBottom: 16,
  },
  status: {
    color: colors.muted,
    marginTop: 14,
    fontSize: 15,
  },
});