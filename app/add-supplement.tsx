import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  addSupplement,
  getSupplement,
  updateSupplement,
} from '@/db/supplements';
import { formatTime } from '@/db/dates';
import { PrimaryButton } from '@/components/ui';
import { successFeedback } from '@/haptics';
import { colors, font, radius, spacing } from '@/theme';

export default function AddSupplementScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const isEditing = editingId !== null;

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [stock, setStock] = useState('');
  const [refillAt, setRefillAt] = useState('');
  const [time, setTime] = useState(() => {
    // Default to a sensible morning reminder (8:00 AM).
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit supplement' : 'New supplement',
    });
    if (editingId !== null) {
      getSupplement(editingId).then((s) => {
        if (!s) return;
        setName(s.name);
        setDose(s.dose ?? '');
        setStock(s.stock != null ? String(s.stock) : '');
        setRefillAt(s.refillAt ? String(s.refillAt) : '');
        const d = new Date();
        d.setHours(s.hour, s.minute, 0, 0);
        setTime(d);
      });
    }
  }, [editingId, isEditing, navigation]);

  const canSave = name.trim().length > 0;

  const onTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && selected) setTime(selected);
  };

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const stockNum = Number.parseInt(stock, 10);
      const input = {
        name: name.trim(),
        dose: dose.trim() || null,
        hour: time.getHours(),
        minute: time.getMinutes(),
        stock: Number.isFinite(stockNum) && stock !== '' ? Math.max(0, stockNum) : null,
        refillAt: Math.max(0, Number.parseInt(refillAt, 10) || 0),
      };
      if (editingId !== null) {
        await updateSupplement(editingId, input);
      } else {
        const created = await addSupplement(input);
        if (!created.notificationId) {
          Alert.alert(
            'Reminder not scheduled',
            'The supplement was saved, but notifications are turned off. Enable notifications for Fuel in your device settings to get reminders.',
          );
        }
      }
      successFeedback();
      router.back();
    } catch {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Supplement name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Vitamin D"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoFocus
        />

        <Text style={styles.label}>Dose (optional)</Text>
        <TextInput
          value={dose}
          onChangeText={setDose}
          placeholder="e.g. 1000 IU"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Inventory (optional)</Text>
        <View style={styles.inventoryRow}>
          <View style={styles.inventoryCell}>
            <TextInput
              value={stock}
              onChangeText={(t) => setStock(t.replace(/[^0-9]/g, ''))}
              placeholder="Doses left"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
          <View style={styles.inventoryCell}>
            <TextInput
              value={refillAt}
              onChangeText={(t) => setRefillAt(t.replace(/[^0-9]/g, ''))}
              placeholder="Refill at"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.label}>Remind me daily at</Text>
        {Platform.OS === 'android' && (
          <Pressable
            onPress={() => setShowPicker(true)}
            style={({ pressed }) => [
              styles.timeButton,
              pressed && styles.timeButtonPressed,
            ]}
          >
            <Ionicons name="alarm-outline" size={20} color={colors.accent} />
            <Text style={styles.timeButtonText}>
              {formatTime(time.getHours(), time.getMinutes())}
            </Text>
          </Pressable>
        )}
        {showPicker && (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              themeVariant="dark"
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={isEditing ? 'Save changes' : 'Save & schedule reminder'}
          onPress={save}
          disabled={!canSave}
          loading={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: font.size.lg,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  timeButtonPressed: {
    opacity: 0.7,
  },
  timeButtonText: {
    color: colors.text,
    fontSize: font.size.lg,
    fontWeight: font.weight.medium,
  },
  inventoryRow: { flexDirection: 'row', gap: spacing.sm },
  inventoryCell: { flex: 1 },
  pickerWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
