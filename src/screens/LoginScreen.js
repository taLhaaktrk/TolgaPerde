import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import useDeviceType from '../hooks/useDeviceType';
import LOGO from '../theme/brand';
import { colors, gradients, radii, spacing, shadows } from '../theme/colors';

export default function LoginScreen() {
  const { login } = useAuth();
  const { isPhone } = useDeviceType();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password) {
      setError('Kullanıcı adı ve şifre gerekli.');
      return;
    }
    const result = await login(username, password);
    if (!result.ok) setError(result.error);
  };

  return (
    <View style={styles.flex}>
      {/* Arka plan — derin navy ortada hafif bordo aydınlanma */}
      <LinearGradient
        colors={['#08111E', '#11253C', '#1a0b14', '#11253C', '#08111E']}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.center}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* MARKA — büyük logo + isim altında */}
          <View style={[styles.brand, isPhone && styles.brandPhone]}>
            <Image
              source={LOGO}
              style={[styles.logo, isPhone && styles.logoPhone]}
              resizeMode="contain"
            />
            <Text style={[styles.brandName, isPhone && styles.brandNamePhone]}>TOLGA PERDE</Text>
            <View style={styles.brandUnderline} />
            <Text style={styles.brandTagline}>Dijital Ölçü & Müşteri Defteri</Text>
          </View>

          {/* PANEL — neon çerçeve + form */}
          <View style={styles.panelWrap}>
            <View style={styles.neonOuter} pointerEvents="none" />
            <View style={styles.neonMid} pointerEvents="none" />
            <View style={styles.neonGold} pointerEvents="none" />

            <View style={[styles.card, isPhone && styles.cardPhone, shadows.lg]}>
              <Text style={styles.welcome}>HOŞ GELDİNİZ</Text>
              <Text style={styles.subtitle}>Devam etmek için giriş yapın</Text>

              <Text style={styles.label}>Kullanıcı Adı</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="kullanıcı adı"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleLogin}
              />

              <Text style={[styles.label, { marginTop: spacing.md }]}>Şifre</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                onSubmitEditing={handleLogin}
              />

              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTxt}>{error}</Text>
                </View>
              )}

              <TouchableOpacity activeOpacity={0.85} onPress={handleLogin} style={{ marginTop: spacing.lg }}>
                <LinearGradient
                  colors={gradients.goldButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.loginBtn}
                >
                  <Text style={styles.loginBtnTxt}>GİRİŞ YAP</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footerHint}>Giriş bilgilerinizi yöneticinizden alabilirsiniz.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const CARD_W = 420;

const styles = StyleSheet.create({
  flex: { flex: 1 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  // MARKA BÖLÜMÜ — panel üstünde, dikkat çeker
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandPhone: {
    marginBottom: spacing.md,
  },
  logo: {
    width: 130,
    height: 130,
    // Logo'nun etrafına subtle altın glow
    ...(Platform.OS === 'web'
      ? { filter: 'drop-shadow(0 0 24px rgba(201, 169, 97, 0.45)) drop-shadow(0 0 8px rgba(195, 49, 65, 0.6))' }
      : {
          shadowColor: '#C9A961',
          shadowOpacity: 0.6,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 20,
        }),
  },
  logoPhone: {
    width: 92,
    height: 92,
  },
  brandName: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 6,
    marginTop: spacing.md,
    ...(Platform.OS === 'web'
      ? { textShadow: '0 0 20px rgba(201, 169, 97, 0.4)' }
      : {}),
  },
  brandUnderline: {
    width: 60,
    height: 2,
    backgroundColor: colors.gold,
    marginTop: 8,
    borderRadius: 1,
    opacity: 0.8,
  },
  brandTagline: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 10,
    textTransform: 'uppercase',
  },

  // PANEL
  panelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dış kalın bordo + gerçek neon glow
  neonOuter: {
    position: 'absolute',
    top: -6, bottom: -6, left: -6, right: -6,
    borderRadius: 26,
    borderWidth: 6,
    borderColor: 'rgba(195, 49, 65, 0.55)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 80px 14px rgba(195, 49, 65, 0.55), 0 0 30px 4px rgba(201, 169, 97, 0.35), inset 0 0 20px rgba(195, 49, 65, 0.15)' }
      : {
          shadowColor: '#C33141',
          shadowOpacity: 1,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 40,
        }),
  },
  // Orta keskin bordo çizgi
  neonMid: {
    position: 'absolute',
    top: -2, bottom: -2, left: -2, right: -2,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: 'rgba(195, 49, 65, 0.95)',
  },
  // İç altın hairline
  neonGold: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 97, 0.75)',
  },

  brandNamePhone: {
    fontSize: 20,
    letterSpacing: 4,
    marginTop: spacing.sm,
  },
  card: {
    width: CARD_W,
    maxWidth: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: 22,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  cardPhone: {
    width: '100%',
    padding: spacing.lg,
  },

  welcome: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  label: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: colors.bgInput,
    color: colors.textPrimary,
  },

  errorBox: {
    marginTop: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(226,92,92,0.4)',
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorTxt: { color: colors.danger, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  loginBtn: {
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  loginBtnTxt: { color: colors.primaryDeep, fontWeight: '900', fontSize: 15, letterSpacing: 1 },

  footerHint: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
