import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, shadow } from "../constants/theme";
import type { DietPreference } from "../services/dietPreferences";

type Props = {
  prefs: DietPreference;
  eatenCalories?: number;
  onPressDetails: () => void;
};

function CalorieRing({ size, progress }: { size: number; progress: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clamped);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={colors.border}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={colors.accent}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </Svg>
  );
}

function MacroColumn({
  label,
  value,
  tint,
  bg,
}: {
  label: string;
  value: number;
  tint: string;
  bg: string;
}) {
  return (
    <View style={styles.macroCol}>
      <View style={[styles.macroDot, { backgroundColor: bg }]}>
        <View style={[styles.macroDotInner, { backgroundColor: tint }]} />
      </View>
      <Text style={styles.macroValue}>{Math.round(value)}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

export function TodayCaloriesCard({ prefs, eatenCalories = 0, onPressDetails }: Props) {
  const target = Math.max(prefs.targetCalories, 1);
  const eaten = Math.max(0, Math.min(eatenCalories, target));
  const left = Math.max(0, target - eaten);
  const progress = eaten / target;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Today's Calories</Text>
        <Pressable onPress={onPressDetails} hitSlop={8}>
          <Text style={styles.detailsLink}>Details &gt;</Text>
        </Pressable>
      </View>

      <View style={styles.ringWrap}>
        <CalorieRing size={168} progress={progress} />
        <View style={styles.ringCenter}>
          <Text style={styles.leftBig}>{left}</Text>
          <Text style={styles.leftSub}>kcal left</Text>
        </View>
      </View>

      <Text style={styles.eaten}>{eaten} eaten</Text>

      <View style={styles.macrosRow}>
        <MacroColumn label="Protein" value={prefs.proteinG} tint={colors.protein} bg={colors.proteinSoft} />
        <MacroColumn label="Carbs" value={prefs.carbG} tint={colors.carb} bg={colors.carbSoft} />
        <MacroColumn label="Fat" value={prefs.fatG} tint={colors.fat} bg={colors.fatSoft} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 20,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  detailsLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  ringWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 168,
    marginBottom: 4,
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  leftBig: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 40,
  },
  leftSub: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  eaten: {
    color: colors.accentMuted,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  macroCol: {
    alignItems: "center",
    flex: 1,
  },
  macroDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  macroDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  macroValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  macroLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
});
