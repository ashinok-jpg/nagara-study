import { Pressable, StyleProp, StyleSheet, Switch, Text, TextStyle, View, ViewStyle } from 'react-native';

import { toSegments } from '../engine';
import { BUTTON_HEIGHT, colors, font, space } from './theme';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';

export function Button(props: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  big?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const variant = props.variant ?? 'primary';
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ disabled: !!props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant],
        props.big && { minHeight: 76 },
        props.disabled && styles.disabled,
        pressed && { opacity: 0.8 },
        props.style,
      ]}
    >
      <Text style={[styles.buttonText, { color: textColors[variant] }, props.big && { fontSize: 22 }, props.textStyle]}>{props.title}</Text>
    </Pressable>
  );
}

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  success: { backgroundColor: colors.success },
  danger: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
};
const textColors: Record<Variant, string> = {
  primary: colors.accentText,
  secondary: colors.text,
  success: '#062012',
  danger: colors.danger,
  ghost: colors.textDim,
};

export function Segmented<T>(props: {
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
  testIDPrefix?: string;
}) {
  return (
    <View style={styles.segmented}>
      {props.options.map((o, i) => {
        const active = o.value === props.value;
        return (
          <Pressable
            key={i}
            testID={props.testIDPrefix ? `${props.testIDPrefix}-${i}` : undefined}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => props.onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && { color: colors.accentText }]}>{o.label}</Text>
            {o.sub ? <Text style={[styles.segmentSub, active && { color: colors.accentText }]}>{o.sub}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow(props: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{props.label}</Text>
        {props.sub ? <Text style={styles.toggleSub}>{props.sub}</Text> : null}
      </View>
      <Switch
        testID={props.testID}
        value={props.value}
        onValueChange={props.onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor={colors.text}
      />
    </View>
  );
}

/** **太字** などのマーカーを太字にして表示する */
export function RichText(props: { text: string; style?: TextStyle; testID?: string; numberOfLines?: number }) {
  let segments;
  try {
    segments = toSegments(props.text);
  } catch {
    segments = [{ text: props.text, bold: false }];
  }
  return (
    <Text style={props.style} testID={props.testID} numberOfLines={props.numberOfLines}>
      {segments.map((s, i) =>
        s.bold ? (
          <Text key={i} style={styles.bold}>
            {s.text}
          </Text>
        ) : (
          s.text
        ),
      )}
    </Text>
  );
}

export function SectionTitle(props: { children: React.ReactNode }) {
  return <Text style={styles.section}>{props.children}</Text>;
}

export function Panel(props: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View style={[styles.panel, props.style]} testID={props.testID}>
      {props.children}
    </View>
  );
}

export function ProgressBar(props: { value: number }) {
  const pct = Math.max(0, Math.min(1, props.value));
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: BUTTON_HEIGHT,
    borderRadius: 16,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  buttonText: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  segmented: { flexDirection: 'row', gap: space.sm },
  segment: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.sm,
  },
  segmentActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  segmentText: { color: colors.text, fontWeight: '800', fontSize: 17 },
  segmentSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 },
  toggleLabel: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  toggleSub: { color: colors.textDim, fontSize: font.small, marginTop: 2 },
  bold: { fontWeight: '900', color: colors.bold },
  section: { color: colors.textDim, fontSize: font.small, fontWeight: '800', marginTop: space.md, letterSpacing: 1 },
  panel: { backgroundColor: colors.surface, borderRadius: 16, padding: space.md, borderWidth: 1, borderColor: colors.border },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
