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
import { colors, gradients, spacing } from '../theme/colors';

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
      {/* Arka plan — düz koyu navy */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />

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
            {/* Marka — logo + isim + altın çizgi + slogan */}
            <View style={[styles.brand, isPhone && styles.brandPhone]}>
              <Image
                source={LOGO}
                style={[styles.logo, isPhone && styles.logoPhone]}
                resizeMode="contain"
              />
              <Text style={[styles.brandName, isPhone && styles.brandNamePhone]}>
                TOLGA PERDE
              </Text>
              <View style={styles.brandUnderline} />
              <Text style={styles.brandTagline}>Dijital Ölçü & Müşteri Defteri</Text>
            </View>

            {/* Panel — defter kartı (bordo tint + altın border) */}
            <View style={[styles.card, isPhone && styles.cardPhone]}>
              {/* Bölüm başlığı — altın accent bar */}
              <View style={styles.sectionHead}>
                <View style={styles.sectionBar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>HOŞ GELDİNİZ</Text>
                  <Text style={styles.sectionSubtitle}>devam etmek için giriş yapın</Text>
                </View>
              </View>

              {/* Kullanıcı adı */}
              <Text style={styles.label}>KULLANICI ADI</Text>
              <View style={styles.inputRow}>
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
              </View>

              {/* Şifre */}
              <Text style={[styles.label, { marginTop: 18 }]}>ŞİFRE</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••"
                  placeholderTextColor={colors.textFaint}
                  secureTextEntry
                  onSubmitEditing={handleLogin}
                />
              </View>

              {!!error && (
                <View style={styles.errorBox}>
                  <View style={styles.errorBar} />
                  <Text style={styles.errorTxt}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleLogin}
                style={{ marginTop: 24 }}
              >
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  // MARKA
  brand: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandPhone: {
    marginBottom: 18,
  },
  logo: {
    width: 110,
    height: 110,
    ...(Platform.OS === 'web'
      ? { filter: 'drop-shadow(0 0 20px rgba(201, 169, 97, 0.35))' }
      : {
          shadowColor: '#C9A961',
          shadowOpacity: 0.5,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 16,
        }),
  },
  logoPhone: {
    width: 82,
    height: 82,
  },
  brandName: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 5,
    marginTop: 14,
  },
  brandNamePhone: {
    fontSize: 18,
    letterSpacing: 4,
    marginTop: 10,
  },
  brandUnderline: {
    width: 40,
    height: 2,
    backgroundColor: colors.gold,
    marginTop: 8,
    borderRadius: 1,
    opacity: 0.7,
  },
  brandTagline: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    marginTop: 8,
    textTransform: 'uppercase',
  },

  // Panel — defter kartı
  card: {
    width: CARD_W,
    maxWidth: '100%',
    borderRadius: 14,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 97, 0.35)',
    backgroundColor: 'rgba(92, 13, 20, 0.18)',
  },
  cardPhone: {
    padding: 18,
  },

  // Bölüm başlığı — altın accent bar
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 169, 97, 0.20)',
  },
  sectionBar: {
    width: 3,
    height: 22,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 13,
    color: colors.gold,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 3,
    textTransform: 'lowercase',
    letterSpacing: 0.3,
  },

  // Label — altın uppercase eyebrow
  label: {
    fontSize: 10,
    color: colors.gold,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  inputRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 169, 97, 0.35)',
  },
  input: {
    fontSize: 16, // iOS auto-zoom fix
    paddingVertical: 12,
    paddingHorizontal: 2,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
  },

  errorBox: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(226,92,92,0.10)',
    borderColor: 'rgba(226,92,92,0.35)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.danger,
    borderRadius: 2,
  },
  errorTxt: { flex: 1, color: colors.danger, fontSize: 13, fontWeight: '700' },

  loginBtn: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.gold,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnTxt: {
    color: colors.primaryDeep,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1.5,
  },

  footerHint: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: 0.3,
  },
});
