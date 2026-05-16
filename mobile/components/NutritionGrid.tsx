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
      <View style={[styles.cell, styles.cellCal]}>
        <Text style={styles.label}>Калории</Text>
        <Text style={[styles.value, styles.valueCal]}>
          {calories != null ? `${fmt(calories)} ккал` : "—"}
        </Text>
      </View>
      <View style={[styles.cell, styles.cellProtein]}>
        <Text style={styles.label}>Белки</Text>
        <Text style={[styles.value, styles.valueProtein]}>
          {protein != null ? `${fmt(protein)} г` : "—"}
        </Text>
      </View>
      <View style={[styles.cell, styles.cellFat]}>
        <Text style={styles.label}>Жиры</Text>
        <Text style={[styles.value, styles.valueFat]}>
          {fat != null ? `${fmt(fat)} г` : "—"}
        </Text>
      </View>
      <View style={[styles.cell, styles.cellCarb]}>
        <Text style={styles.label}>Углеводы</Text>
        <Text style={[styles.value, styles.valueCarb]}>
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
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  cell: {
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  cellCal: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  cellProtein: {
    borderColor: colors.protein,
    backgroundColor: colors.proteinSoft,
  },
  cellFat: {
    borderColor: colors.fat,
    backgroundColor: colors.fatSoft,
  },
  cellCarb: {
    borderColor: colors.carb,
    backgroundColor: colors.carbSoft,
  },
  label: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 4,
    fontWeight: "600",
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  valueCal: { color: colors.accentMuted },
  valueProtein: { color: colors.protein },
  valueFat: { color: colors.fat },
  valueCarb: { color: colors.carb },
});
