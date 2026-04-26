import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/theme";

interface Props {
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

function fmt(v?: number): string {
  if (v == null) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function NutritionGrid({ calories, protein, fat, carbs }: Props) {
  if (calories == null && protein == null && fat == null && carbs == null) {
    return null;
  }

  return (
    <View style={styles.grid}>
      <View style={[styles.cell, styles.cellAccent]}>
        <Text style={styles.label}>Калории</Text>
        <Text style={styles.value}>
          {calories != null ? `${fmt(calories)} ккал` : "—"}
        </Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.label}>Белки</Text>
        <Text style={styles.value}>
          {protein != null ? `${fmt(protein)} г` : "—"}
        </Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.label}>Жиры</Text>
        <Text style={styles.value}>
          {fat != null ? `${fmt(fat)} г` : "—"}
        </Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.label}>Углеводы</Text>
        <Text style={styles.value}>
          {carbs != null ? `${fmt(carbs)} г` : "—"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  cell: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  cellAccent: {
    borderColor: "rgba(255, 152, 0, 0.45)",
    backgroundColor: colors.accentSoft,
  },
  label: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
});
