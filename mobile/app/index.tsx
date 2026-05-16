import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as api from "../services/api";
import { colors, shadow } from "../constants/theme";
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
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
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
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
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
                <View style={styles.rowIcon}>
                  <Text style={styles.rowIconText}>{r.name.charAt(0).toUpperCase()}</Text>
                </View>
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
  title: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: 4, marginBottom: 6 },
  caption: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  apiHint: { color: colors.muted, fontSize: 11, marginTop: 10 },
  section: { color: colors.text, fontWeight: "800", fontSize: 18, marginTop: 18, marginBottom: 12 },
  list: { flex: 1 },
  listContent: { paddingBottom: 24, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...shadow.card,
  },
  rowPressed: { opacity: 0.92 },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowIconText: { color: colors.accentMuted, fontWeight: "800", fontSize: 18 },
  rowText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" },
  chevron: { fontSize: 24, color: colors.muted, fontWeight: "300" },
  empty: { color: colors.muted, textAlign: "center", padding: 24, fontSize: 14 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
});
