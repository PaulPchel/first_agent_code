import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { colors } from "../../constants/theme";
import * as api from "../../services/api";
import { DishListRow } from "../../components/DishListRow";

function bestScore(d: api.Dish): number {
  const protein = d.protein ?? 0;
  const calories = d.calories ?? 0;
  const fat = d.fat ?? 0;
  return protein * 2 - calories * 0.01 - fat * 0.4;
}

export default function RestaurantScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const restaurantId = Number(id);

  const [dishes, setDishes] = useState<api.Dish[]>([]);
  const [activeTab, setActiveTab] = useState<"best" | "all">("best");

  useEffect(() => {
    if (!restaurantId) return;
    void load();
  }, [restaurantId]);

  async function load() {
    try {
      const data = await api.fetchDishes(restaurantId);
      setDishes(data.results || []);
    } catch {
      setDishes([]);
    }
  }

  const bestForMe = useMemo(() => {
    return [...dishes].sort((a, b) => bestScore(b) - bestScore(a)).slice(0, 10);
  }, [dishes]);

  const visible = activeTab === "best" ? bestForMe : dishes;

  function openDish(d: api.Dish) {
    router.push({
      pathname: "/restaurant/[id]/dish/[dishId]",
      params: {
        id: String(restaurantId),
        dishId: String(d.id),
        restaurantName: name ? String(name) : "",
      },
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: name ? String(name) : "Ресторан" }} />
      <View style={styles.container}>
        <Text style={styles.header}>{name ? String(name) : "Ресторан"}</Text>
        <Text style={styles.sub}>Персональное здоровое меню (карта не используется)</Text>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === "best" && styles.tabActive]}
            onPress={() => setActiveTab("best")}
          >
            <Text style={[styles.tabText, activeTab === "best" && styles.tabTextActive]}>
              Лучшее для меня
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "all" && styles.tabActive]}
            onPress={() => setActiveTab("all")}
          >
            <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
              Все блюда
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {visible.length === 0 ? (
            <Text style={styles.empty}>Нет блюд</Text>
          ) : (
            visible.map((d) => (
              <DishListRow
                key={d.id}
                dishName={d.dish_name}
                calories={d.calories}
                protein={d.protein}
                onPress={() => openDish(d)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  header: { color: colors.text, fontSize: 24, fontWeight: "800" },
  sub: { color: colors.muted, marginTop: 4, marginBottom: 14 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  tabText: { color: colors.text, fontWeight: "600" },
  tabTextActive: { color: colors.accent },
  list: { paddingBottom: 28 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 30 },
});