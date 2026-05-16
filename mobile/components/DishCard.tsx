import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { colors, shadow } from "../constants/theme";
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
  cardStyle?: StyleProp<ViewStyle>;
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
  cardStyle,
}: Props) {
  return (
    <View style={[styles.card, cardStyle]}>
      <Text style={styles.name}>{dishName}</Text>
      {restaurant ? <Text style={styles.restaurant}>{restaurant}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <NutritionGrid calories={calories} protein={protein} fat={fat} carbs={carbs} />
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
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  restaurant: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  price: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.accentMuted,
  },
});
