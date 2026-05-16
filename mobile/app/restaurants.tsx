import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as api from "../services/api";
import { colors, shadow } from "../constants/theme";

function paramString(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

export default function RestaurantsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; selectedId?: string }>();

  const [query, setQuery] = useState(() => paramString(params.q));
  const [restaurants, setRestaurants] = useState<api.Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const raw = paramString(params.selectedId);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  });

  const loadRestaurants = useCallback(async (q: string) => {
    try {
      const data = await api.fetchRestaurants(q.trim() || undefined);
      setRestaurants(data.results || []);
    } catch {
      setRestaurants([]);
    }
  }, []);

  useEffect(() => {
    const nextQ = paramString(params.q);
    const rawSel = paramString(params.selectedId);
    const nextSel = rawSel ? Number(rawSel) : NaN;
    setQuery(nextQ);
    setSelectedId(Number.isFinite(nextSel) ? nextSel : null);
    void loadRestaurants(nextQ);
  }, [params.q, params.selectedId, loadRestaurants]);

  function onChangeQuery(text: string) {
    setQuery(text);
    void loadRestaurants(text.trim());
  }

  function onContinue() {
    const selected = restaurants.find((r) => r.id === selectedId);
    if (!selected) return;
    router.push({
      pathname: "/loading",
      params: {
        restaurantId: String(selected.id),
        restaurantName: selected.name,
      },
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: "Выбор ресторана" }} />
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Поиск ресторанов"
          placeholderTextColor={colors.muted}
        />

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {restaurants.length === 0 ? (
            <Text style={styles.empty}>Рестораны не найдены</Text>
          ) : (
            restaurants.map((r) => {
              const active = r.id === selectedId;
              return (
                <Pressable
                  key={r.id}
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => setSelectedId(r.id)}
                >
                  <Text style={[styles.itemText, active && styles.itemTextActive]}>{r.name}</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <Pressable
          style={[styles.primaryBtn, !selectedId && styles.disabled]}
          onPress={onContinue}
          disabled={!selectedId}
        >
          <Text style={styles.primaryBtnText}>Далее</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 12 },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  itemActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  itemText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  itemTextActive: { color: colors.accentMuted, fontWeight: "700" },
  empty: { color: colors.muted, textAlign: "center", padding: 24 },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    ...shadow.soft,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  disabled: { opacity: 0.45 },
});
