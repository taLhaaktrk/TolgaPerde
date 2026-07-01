import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, radii, spacing } from '../../theme/colors';

// Basit dropdown — { label, value } listesi alır, modal'la açılır.
// Cross-platform (web + native).
export default function Dropdown({ value, onChange, options, placeholder = 'Seç' }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerTxt, !current && styles.placeholder]}>
          {current ? current.label : placeholder}
        </Text>
        <Text style={styles.chev}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.menu}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {options.map((opt) => {
                    const selected = opt.value === value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.item, selected && styles.itemSelected]}
                        onPress={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.itemTxt, selected && styles.itemTxtSelected]}>
                          {opt.label}
                        </Text>
                        {selected && <Text style={styles.check}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 140,
  },
  triggerTxt: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  placeholder: { color: colors.textFaint, fontWeight: '500' },
  chev: { color: colors.gold, fontSize: 14, marginLeft: 8 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  menu: {
    width: '100%',
    maxWidth: 320,
    maxHeight: 420,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemSelected: { backgroundColor: colors.goldSoft },
  itemTxt: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  itemTxtSelected: { color: colors.gold, fontWeight: '800' },
  check: { color: colors.gold, fontWeight: '900', fontSize: 16 },
});
