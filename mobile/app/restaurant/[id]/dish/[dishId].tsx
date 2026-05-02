import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../../constants/theme";
import * as api from "../../../../services/api";
import { DishCard } from "../../../../components/DishCard";
import { getUserId } from "../../../../services/userId";

function paramString(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

export default function DishDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string;
    dishId?: string;
    restaurantName?: string;
  }>();

  const restaurantId = Number(paramString(params.id));
  const dishId = Number(paramString(params.dishId));
  const restaurantName = paramString(params.restaurantName);

  const [dish, setDish] = useState<api.Dish | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(restaurantId) || !Number.isFinite(dishId)) {
      setDish(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.fetchDishes(restaurantId);
      const found = (data.results || []).find((d) => d.id === dishId) ?? null;
      setDish(found);
    } catch {
      setDish(null);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, dishId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onChoose() {
    if (!dish) return;
    try {
      setSaving(true);
      const userId = await getUserId();
      await api.saveUserDish(userId, dish.id);
      const result = await api.getUserResult(userId);
      Alert.alert(
        "Выбор сохранён",
        `${result.dish_name}\n${result.calories ?? "—"} ккал · Б ${result.protein ?? "—"} · Ж ${result.fat ?? "—"} · У ${result.carbs ?? "—"}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch {
      Alert.alert("Ошибка", "Не удалось сохранить блюдо");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Блюдо" }} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </>
    );
  }

  if (!dish) {
    return (
      <>
        <Stack.Screen options={{ title: "Блюдо" }} />
        <View style={styles.centered}>
          <Text style={styles.muted}>Блюдо не найдено</Text>
          <Pressable style={styles.linkBtn} onPress={() => router.back()}>
            <Text style={styles.linkBtnText}>Назад</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: dish.dish_name.slice(0, 28) }} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Персональное меню</Text>
        <Text style={styles.screenTitle}>{dish.dish_name}</Text>
        {restaurantName ? <Text style={styles.restaurant}>{restaurantName}</Text> : null}

        <DishCard
          dishName={dish.dish_name}
          restaurant={restaurantName || undefined}
          description={dish.description}
          price={dish.price}
          calories={dish.calories}
          protein={dish.protein}
          fat={dish.fat}
          carbs={dish.carbs}
          cardStyle={styles.cardFlat}
        />

        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>Почему это подходит</Text>
          <Text style={styles.hintText}>
            Калории и макросы помогают выбрать сбалансированный вариант в рамках вашего здорового
            меню в этом ресторане.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
          onPress={() => void onChoose()}
          disabled={saving}
        >
          <Text style={styles.primaryBtnText}>{saving ? "Сохранение…" : "Выбрать это блюдо"}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  muted: { color: colors.muted, fontSize: 16 },
  linkBtn: { marginTop: 16, padding: 12 },
  linkBtnText: { color: colors.accent, fontWeight: "600", fontSize: 16 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  screenTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  restaurant: { color: colors.muted, fontSize: 15, marginBottom: 16 },
  cardFlat: { marginBottom: 8 },
  hintBox: {
    marginTop: 8,
    backgroundColor: colors.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  hintTitle: { color: colors.text, fontWeight: "700", marginBottom: 8, fontSize: 15 },
  hintText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: "#000", fontWeight: "800", fontSize: 16 },
});