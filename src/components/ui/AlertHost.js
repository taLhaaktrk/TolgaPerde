import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { subscribe } from '../../utils/alert';
import { colors, gradients, radii, spacing, shadows } from '../../theme/colors';

// Uygulamanın root'unda render edilir — tüm Alert.alert çağrılarını dinler ve
// kendi şık modal'ında gösterir. Native alert/window.confirm kullanmaz.
export default function AlertHost() {
  const [state, setState] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: 'Tamam' }],
    tone: 'info',
  });

  useEffect(() => {
    return subscribe((payload) => {
      setState({ visible: true, ...payload });
    });
  }, []);

  const close = () => setState((s) => ({ ...s, visible: false }));

  const handlePress = (btn) => {
    close();
    // onPress içinde başka bir Alert.alert çağrılabilir; iç içe Modal'ları
    // engellemek için fade animasyonu bitsin diye 250ms bekle.
    setTimeout(() => btn?.onPress?.(), 250);
  };

  const accent =
    state.tone === 'danger' ? colors.danger
    : state.tone === 'warning' ? colors.warning
    : state.tone === 'success' ? colors.success
    : colors.gold;

  // Buton sıralaması: cancel solda, ana aksiyon sağda (modern UX)
  const sortedButtons = [...state.buttons].sort((a, b) => {
    const order = (b) => (b.style === 'cancel' ? 0 : b.style === 'destructive' ? 2 : 1);
    return order(a) - order(b);
  });

  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.card, shadows.lg]}>
          {/* Üst accent şerit — tone'a göre renk */}
          <View style={[styles.accent, { backgroundColor: accent }]} />

          <View style={styles.body}>
            {!!state.title && <Text style={styles.title}>{state.title}</Text>}
            {!!state.message && <Text style={styles.message}>{state.message}</Text>}

            <View style={styles.actions}>
              {sortedButtons.map((btn, i) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                const isPrimary = !isDestructive && !isCancel;

                if (isPrimary) {
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handlePress(btn)}
                      activeOpacity={0.85}
                      style={{ flex: 1 }}
                    >
                      <LinearGradient
                        colors={gradients.goldButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.btnPrimary}
                      >
                        <Text style={styles.btnPrimaryTxt}>{btn.text}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                }

                if (isDestructive) {
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handlePress(btn)}
                      activeOpacity={0.85}
                      style={[styles.btn, styles.btnDanger]}
                    >
                      <Text style={styles.btnDangerTxt}>{btn.text}</Text>
                    </TouchableOpacity>
                  );
                }

                // cancel
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handlePress(btn)}
                    activeOpacity={0.7}
                    style={[styles.btn, styles.btnGhost]}
                  >
                    <Text style={styles.btnGhostTxt}>{btn.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  accent: { height: 4 },
  body: { padding: spacing.xl },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  btn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'transparent',
  },
  btnGhostTxt: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
  btnDanger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(226,92,92,0.5)',
  },
  btnDangerTxt: { color: colors.danger, fontWeight: '800', fontSize: 14 },
  btnPrimary: {
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryTxt: {
    color: colors.primaryDeep,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
