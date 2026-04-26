import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import { colors } from "../constants/theme";
import { DishCard } from "../components/DishCard";
import * as api from "../services/api";
import { getUserId } from "../services/userId";

export default function HomeScreen() {
  const [userId, setUserId] = useState<string>("");

  // Quick search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<api.Dish[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Restaurant flow
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [restaurants, setRestaurants] = useState<api.Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);

  // Dish flow
  const [dishQuery, setDishQuery] = useState("");
  const [dishes, setDishes] = useState<api.Dish[]>([]);
  const [selectedDishId, setSelectedDishId] = useState<number | null>(null);

  // Result
  const [result, setResult] = useState<api.NutritionResult | null>(null);
  const [resultLoading, setResultLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getUserId().then(setUserId);
    loadRestaurants();
  }, []);

  async function loadRestaurants(q?: string) {
    try {
      const data = await api.fetchRestaurants(q || undefined);
      setRestaurants(data.results || []);
    } catch {
      setRestaurants([]);
    }
  }

  function onRestaurantQueryChange(text: string) {
    setRestaurantQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadRestaurants(text), 300);
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setSearchLoading(true);
    try {
      const data = await api.searchDishes(query.trim());
      setSearchResults(data.results || []);
    } catch {
      Alert.alert("Ошибка", "Ошибка подключения к серверу");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSaveRestaurant() {
    if (!selectedRestaurantId || !userId) {
      Alert.alert("", "Выбери ресторан из списка");
      return;
    }
    try {
      await api.saveUserRestaurant(userId, selectedRestaurantId);
      const data = await api.fetchDishes(selectedRestaurantId);
      setDishes(data.results || []);
      setSelectedDishId(null);
      setDishQuery("");
      Alert.alert("", "Ресторан сохранён");
    } catch (e: any) {
      Alert.alert("Ошибка", e.message);
    }
  }

  async function handleSaveDish() {
    if (!selectedDishId || !userId) {
      Alert.alert("", "Выбери блюдо из списка");
      return;
    }
    try {
      await api.saveUserDish(userId, selectedDishId);
      Alert.alert("", "Блюдо сохранено");
    } catch (e: any) {
      Alert.alert("Ошибка", e.message);
    }
  }

  async function handleShowResult() {
    if (!userId) return;
    setResultLoading(true);
    try {
      const data = await api.getUserResult(userId);
      setResult(data);
    } catch (e: any) {
      Alert.alert("Ошибка", e.message);
      setResult(null);
    } finally {
      setResultLoading(false);
    }
  }

  const filteredDishes = dishQuery.trim()
    ? dishes.filter((d) => {
        const q = dishQuery.toLowerCase();
        return (
          (d.dish_name ?? "").toLowerCase().includes(q) ||
          (d.description ?? "").toLowerCase().includes(q)
        );
      })
    : dishes;

  return (
    <>
      <Stack.Screen options={{ title: "🍔 Food Agent" }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Quick Search */}
          <SectionHeader title="🔎 Быстрый поиск" />
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Например: burger"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <Pressable style={styles.searchBtn} onPress={handleSearch}>
              <Text style={styles.searchBtnText}>Искать</Text>
            </Pressable>
          </View>

          {searchLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : searchResults.length > 0 ? (
            searchResults.map((item, i) => (
              <DishCard
                key={item.id ?? i}
                dishName={item.dish_name}
                restaurant={item.restaurant}
                description={item.description}
                price={item.price}
                calories={item.calories}
                protein={item.protein}
                fat={item.fat}
                carbs={item.carbs}
              />
            ))
          ) : null}

          {/* Step 1: Restaurant */}
          <SectionHeader title="1️⃣ Ресторан" />
          <TextInput
            style={styles.input}
            placeholder="Поиск ресторана..."
            placeholderTextColor={colors.muted}
            value={restaurantQuery}
            onChangeText={onRestaurantQueryChange}
          />
          <View style={styles.listBox}>
            <ScrollView nestedScrollEnabled>
              {restaurants.length === 0 ? (
                <Text style={styles.emptyText}>Нет ресторанов</Text>
              ) : (
                restaurants.map((r) => (
                  <Pressable
                    key={r.id}
                    style={[
                      styles.listItem,
                      selectedRestaurantId === r.id && styles.listItemSelected,
                    ]}
                    onPress={() => setSelectedRestaurantId(r.id)}
                  >
                    <Text
                      style={[
                        styles.listItemText,
                        selectedRestaurantId === r.id &&
                          styles.listItemTextSelected,
                      ]}
                    >
                      {r.name}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
          <Pressable style={styles.btn} onPress={handleSaveRestaurant}>
            <Text style={styles.btnText}>Сохранить ресторан</Text>
          </Pressable>

          {/* Step 2: Dish */}
          <SectionHeader title="2️⃣ Блюдо" />
          <TextInput
            style={[styles.input, !selectedRestaurantId && styles.inputDisabled]}
            placeholder="Поиск блюда..."
            placeholderTextColor={colors.muted}
            value={dishQuery}
            onChangeText={setDishQuery}
            editable={!!selectedRestaurantId}
          />
          <View style={styles.listBox}>
            <ScrollView nestedScrollEnabled>
              {filteredDishes.length === 0 ? (
                <Text style={styles.emptyText}>
                  {selectedRestaurantId ? "Ничего не найдено" : "Сначала выбери ресторан"}
                </Text>
              ) : (
                filteredDishes.map((d) => (
                  <Pressable
                    key={d.id}
                    style={[
                      styles.listItem,
                      selectedDishId === d.id && styles.listItemSelected,
                    ]}
                    onPress={() => setSelectedDishId(d.id)}
                  >
                    <Text
                      style={[
                        styles.listItemText,
                        selectedDishId === d.id && styles.listItemTextSelected,
                      ]}
                    >
                      {d.dish_name}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
          <Pressable
            style={[styles.btn, !selectedRestaurantId && styles.btnDisabled]}
            onPress={handleSaveDish}
            disabled={!selectedRestaurantId}
          >
            <Text style={styles.btnText}>Сохранить блюдо</Text>
          </Pressable>

          {/* Step 3: Result */}
          <SectionHeader title="3️⃣ Результат" />
          <Pressable style={styles.mainBtn} onPress={handleShowResult}>
            <Text style={styles.mainBtnText}>
              Показать калории и состав блюда
            </Text>
          </Pressable>

          {resultLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : result ? (
            <DishCard
              dishName={result.dish_name}
              restaurant={result.restaurant_name}
              price={result.price}
              calories={result.calories}
              protein={result.protein}
              fat={result.fat}
              carbs={result.carbs}
            />
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 28,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 15,
  },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  inputDisabled: {
    opacity: 0.45,
  },
  listBox: {
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 220,
    marginBottom: 10,
    overflow: "hidden",
  },
  listItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemSelected: {
    backgroundColor: colors.accentSoft,
  },
  listItemText: {
    color: colors.text,
    fontSize: 15,
  },
  listItemTextSelected: {
    color: colors.accent,
    fontWeight: "600",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    padding: 14,
    textAlign: "center",
  },
  btn: {
    backgroundColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 4,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 15,
  },
  mainBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  mainBtnText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
  },
  loader: {
    marginVertical: 20,
  },
});
