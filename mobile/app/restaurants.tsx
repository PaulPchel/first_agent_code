import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as api from "../services/api";
import { colors } from "../constants/theme";

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

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  list: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listContent: { paddingVertical: 2 },
  item: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemActive: { backgroundColor: colors.accentSoft },
  itemText: { color: colors.text, fontSize: 16 },
  itemTextActive: { color: colors.accent, fontWeight: "700" },
  empty: { color: colors.muted, textAlign: "center", padding: 20 },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.45 },
});