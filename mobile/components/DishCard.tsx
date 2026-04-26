import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/theme";
import { NutritionGrid } from "./NutritionGrid";

interface Props {
  dishName: string;
  restaurant?: string;
  description?: string;
  price?: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

export function DishCard({
  dishName,
  restaurant,
  description,
  price,
  calories,
  protein,
  fat,
  carbs,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{dishName}</Text>
      {restaurant ? (
        <Text style={styles.restaurant}>{restaurant}</Text>
      ) : null}
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      <NutritionGrid
        calories={calories}
        protein={protein}
        fat={fat}
        carbs={carbs}
      />
      {price != null ? (
        <Text style={styles.price}>
          {Number.isInteger(price) ? price : price.toFixed(1)} ₽
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  restaurant: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.accent,
  },
});
