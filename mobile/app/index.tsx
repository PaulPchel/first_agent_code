import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as api from "../services/api";
import { colors } from "../constants/theme";
import { DietPreferenceIcon } from "../components/DietPreferenceIcon";
import { DietPreferenceModal } from "../components/DietPreferenceModal";

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [restaurants, setRestaurants] = useState<api.Restaurant[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    void loadRestaurants("");
  }, []);

  async function loadRestaurants(q: string) {
    setLoadError(null);
    try {
      const data = await api.fetchRestaurants(q.trim() || undefined);
      setRestaurants(data.results || []);
    } catch (e) {
      setRestaurants([]);
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }

  function onSearchChange(text: string) {
    setQuery(text);
    void loadRestaurants(text);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Главная",
          headerRight: () => (
            <Pressable
              onPress={() => setPrefsOpen(true)}
              hitSlop={12}
              style={styles.headerIconBtn}
              accessibilityLabel="Diet preferences"
            >
              <DietPreferenceIcon />
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Что хочешь поесть?</Text>
        <Text style={styles.caption}>
          Список из каталога (геолокации нет). Ищи по названию или оставь поле пустым.
        </Text>

        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onSearchChange}
          placeholder="Поиск ресторанов"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.apiHint} numberOfLines={2}>
          API: {api.API_BASE_URL}
        </Text>

        <Text style={styles.section}>Рестораны</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {restaurants.length === 0 ? (
            <Text style={styles.empty}>
              {loadError
                ? `Ошибка сети: ${loadError}`
                : query.trim()
                  ? "Ничего не найдено. Очисти поиск или попробуй другое имя."
                  : "Список пуст. Проверь, что бэкенд запущен и в БД есть рестораны."}
            </Text>
          ) : (
            restaurants.map((r) => (
              <Pressable
                key={r.id}
                style={styles.row}
                onPress={() =>
                  router.push({
                    pathname: "/loading",
                    params: {
                      restaurantId: String(r.id),
                      restaurantName: r.name,
                    },
                  })
                }
              >
                <Text style={styles.rowText}>{r.name}</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      <DietPreferenceModal visible={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginTop: 8, marginBottom: 6 },
  caption: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  apiHint: { color: colors.muted, fontSize: 11, marginTop: 8 },
  section: { color: colors.text, fontWeight: "700", fontSize: 17, marginTop: 14, marginBottom: 8 },
  list: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listContent: { paddingVertical: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1, color: colors.text, fontSize: 16 },
  chevron: { fontSize: 22, color: colors.accent, fontWeight: "300" },
  empty: { color: colors.muted, textAlign: "center", padding: 20, fontSize: 14 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
