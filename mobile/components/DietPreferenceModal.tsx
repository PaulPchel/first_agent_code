import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, shadow } from "../constants/theme";
import {
  type DietPreference,
  CALORIE_STEPS,
  DEFAULT_DIET_PREFERENCE,
  MEAL_CAL_MIN,
  MEAL_CAL_MAX,
  alignMacrosToTargetCalories,
  syncCaloriesWithMacrosAfterMacroEdit,
  loadDietPreferences,
  saveDietPreferences,
} from "../services/dietPreferences";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const MACRO_MAX = 200;

function CalorieArc({ ratio, size }: { ratio: number; size: number }) {
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;
  const d = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;
  const clamped = Math.min(1, Math.max(0, ratio));

  return (
    <Svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
      <Path d={d} stroke={colors.border} strokeWidth={14} fill="none" strokeLinecap="round" />
      <Path
        d={d}
        stroke={colors.accent}
        strokeWidth={14}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${Math.PI * r}`}
        strokeDashoffset={`${Math.PI * r * (1 - clamped)}`}
      />
    </Svg>
  );
}

export function DietPreferenceModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<DietPreference>({ ...DEFAULT_DIET_PREFERENCE });

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const didHoldRepeat = useRef(false);

  const hydrate = useCallback(async () => {
    const loaded = await loadDietPreferences();
    setDraft(loaded);
  }, []);

  useEffect(() => {
    if (visible) void hydrate();
  }, [visible, hydrate]);

  useEffect(
    () => () => {
      clearHoldTimers();
    },
    []
  );

  function clearHoldTimers() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (repeatIv.current) clearInterval(repeatIv.current);
    holdTimer.current = null;
    repeatIv.current = null;
  }

  function bindCalHold(deltaSign: -1 | 1) {
    return {
      onPress: () => {
        if (!didHoldRepeat.current) {
          setDraft((p) =>
            alignMacrosToTargetCalories({
              ...p,
              targetCalories: Math.min(
                MEAL_CAL_MAX,
                Math.max(MEAL_CAL_MIN, p.targetCalories + deltaSign * p.calorieStep)
              ),
            })
          );
        }
        didHoldRepeat.current = false;
      },
      onPressIn: () => {
        didHoldRepeat.current = false;
        holdTimer.current = setTimeout(() => {
          didHoldRepeat.current = true;
          repeatIv.current = setInterval(() => {
            setDraft((p) =>
              alignMacrosToTargetCalories({
                ...p,
                targetCalories: Math.min(
                  MEAL_CAL_MAX,
                  Math.max(MEAL_CAL_MIN, p.targetCalories + deltaSign * p.calorieStep)
                ),
              })
            );
          }, 70);
        }, 450);
      },
      onPressOut: () => {
        clearHoldTimers();
      },
    };
  }

  async function onReset() {
    setDraft({ ...DEFAULT_DIET_PREFERENCE });
  }

  async function onApply() {
    await saveDietPreferences({
      ...draft,
      dietType: "none",
      mealType: "none",
      likes: [],
      dislikes: [],
    });
    onClose();
  }

  const calRatio = (draft.targetCalories - MEAL_CAL_MIN) / (MEAL_CAL_MAX - MEAL_CAL_MIN);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Предпочтения</Text>
            <Text style={styles.headerSub}>Рекомендации</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Закрыть" style={styles.closeBtn}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.arcCard}>
            <View style={styles.arcWrap}>
              <CalorieArc ratio={calRatio} size={220} />
              <View style={styles.calOverlay}>
                <View style={styles.calRow}>
                  <Pressable style={styles.stepBtn} {...bindCalHold(-1)} accessibilityLabel="Меньше калорий">
                    <Text style={styles.stepTxt}>−</Text>
                  </Pressable>
                  <Text style={styles.calBig}>{draft.targetCalories}</Text>
                  <Pressable style={styles.stepBtn} {...bindCalHold(1)} accessibilityLabel="Больше калорий">
                    <Text style={styles.stepTxt}>+</Text>
                  </Pressable>
                </View>
                <Text style={styles.calLabel}>Ккал на приём пищи</Text>
              </View>
            </View>
          </View>

          <Text style={styles.stepHint}>Шаг калорий (− / +), удерживай для быстрого изменения</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {CALORIE_STEPS.map((s) => {
              const active = draft.calorieStep === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.stepChip, active && styles.stepChipActive]}
                  onPress={() => setDraft((p) => ({ ...p, calorieStep: s }))}
                >
                  <Text style={[styles.stepChipText, active && styles.stepChipTextActive]}>{s}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <MacroSlider
            label="Белки"
            color={colors.protein}
            value={draft.proteinG}
            valueColor={colors.protein}
            onChange={(v) =>
              setDraft((p) => syncCaloriesWithMacrosAfterMacroEdit({ ...p, proteinG: v }))
            }
          />
          <MacroSlider
            label="Углеводы"
            color={colors.carb}
            value={draft.carbG}
            valueColor={colors.carb}
            onChange={(v) => setDraft((p) => syncCaloriesWithMacrosAfterMacroEdit({ ...p, carbG: v }))}
          />
          <MacroSlider
            label="Жиры"
            color={colors.fat}
            value={draft.fatG}
            valueColor={colors.fat}
            onChange={(v) => setDraft((p) => syncCaloriesWithMacrosAfterMacroEdit({ ...p, fatG: v }))}
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable style={styles.resetBtn} onPress={() => void onReset()}>
            <Text style={styles.resetTxt}>Сброс</Text>
          </Pressable>
          <Pressable style={styles.applyBtn} onPress={() => void onApply()}>
            <Text style={styles.applyTxt}>Сохранить</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MacroSlider({
  label,
  color,
  valueColor,
  value,
  onChange,
}: {
  label: string;
  color: string;
  valueColor: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.macroBlock}>
      <View style={styles.macroTop}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={[styles.macroVal, { color: valueColor }]}>{Math.round(value)} г</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={MACRO_MAX}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={color}
        maximumTrackTintColor={colors.border}
        thumbTintColor={color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: "800" },
  headerSub: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  close: { color: colors.muted, fontSize: 18, fontWeight: "600" },
  scroll: { flex: 1, paddingHorizontal: 20 },
  arcCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
    ...shadow.card,
  },
  arcWrap: { alignItems: "center" },
  calOverlay: {
    position: "absolute",
    top: 36,
    alignItems: "center",
    width: "100%",
  },
  calRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  stepTxt: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "500",
    lineHeight: 28,
    textAlign: "center",
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  calBig: { color: colors.text, fontSize: 40, fontWeight: "800", minWidth: 120, textAlign: "center" },
  calLabel: { color: colors.textSecondary, marginTop: 8, fontSize: 13 },
  stepHint: { color: colors.muted, fontSize: 12, marginBottom: 10 },
  stepChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    ...shadow.soft,
  },
  stepChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  stepChipText: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },
  stepChipTextActive: { color: colors.accentMuted, fontWeight: "700" },
  macroBlock: { marginBottom: 20 },
  macroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  macroLabel: { color: colors.text, fontWeight: "700", fontSize: 15 },
  macroVal: { fontWeight: "700", fontSize: 15 },
  slider: { width: "100%", height: 40 },
  chipsScroll: { marginBottom: 12 },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetTxt: { color: colors.text, fontWeight: "700", fontSize: 15 },
  applyBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    ...shadow.soft,
  },
  applyTxt: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
