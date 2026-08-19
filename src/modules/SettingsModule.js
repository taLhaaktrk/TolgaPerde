import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useVersionCheck from '../hooks/useVersionCheck';
import { useAuth } from '../context/AuthContext';
import { restoreAllReminders } from '../services/customerService';
import { createTestCustomers, deleteTestCustomers } from '../services/testDataService';
import Alert from '../utils/alert';
import { colors } from '../theme/colors';

export default function SettingsModule() {
  const { user } = useAuth();
  const versionInfo = useVersionCheck();
  const insets = useSafeAreaInsets();
  const [restoring, setRestoring] = useState(false);
  const [testBusy, setTestBusy] = useState(null); // 'create' | 'delete' | null
  const updateAvailable =
    versionInfo.latestVersion &&
    versionInfo.bundledVersion &&
    versionInfo.latestVersion !== versionInfo.bundledVersion;

  const handleCreateTests = () => {
    Alert.alert(
      'Test Müşterileri Oluşturulsun mu?',
      '6 test müşterisi eklenecek (TEST1..TEST6). Hepsi telefon 05511009340. Yaklaşan Taksitler ve Hatırlatma listelerinde farklı senaryolarda görüneceklerdir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ekle',
          style: 'default',
          onPress: async () => {
            setTestBusy('create');
            try {
              const result = await createTestCustomers();
              Alert.alert(
                'Tamam',
                `${result.created} test müşterisi eklendi. Ana Sayfa'ya git, Yaklaşan Taksitler ve Hatırlatma listelerini kontrol et.`,
                [{ text: 'Tamam' }]
              );
            } catch (e) {
              Alert.alert('Hata', e?.message || 'Test müşterileri eklenemedi.', [{ text: 'Tamam' }], { tone: 'danger' });
            } finally {
              setTestBusy(null);
            }
          },
        },
      ],
      { tone: 'warning' }
    );
  };

  const handleDeleteTests = () => {
    Alert.alert(
      'Test Müşterileri Silinsin mi?',
      'Adı "TEST" ile başlayan tüm müşteriler kalıcı olarak silinir. Gerçek müşteriler etkilenmez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, sil',
          style: 'destructive',
          onPress: async () => {
            setTestBusy('delete');
            try {
              const result = await deleteTestCustomers();
              Alert.alert(
                'Tamam',
                result.deleted > 0
                  ? `${result.deleted} test müşterisi silindi.`
                  : 'Test müşterisi bulunamadı.',
                [{ text: 'Tamam' }]
              );
            } catch (e) {
              Alert.alert('Hata', e?.message || 'Silme başarısız.', [{ text: 'Tamam' }], { tone: 'danger' });
            } finally {
              setTestBusy(null);
            }
          },
        },
      ],
      { tone: 'danger' }
    );
  };

  const handleRestoreReminders = () => {
    Alert.alert(
      'Silinen Hatırlatmalar Geri Gelsin mi?',
      'Yaklaşan Taksitler ve Hatırlatma listelerinden gizlediğin tüm müşteriler ve taksitler geri gelecek. Müşteri veya ödeme silinmez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, geri yükle',
          style: 'default',
          onPress: async () => {
            setRestoring(true);
            try {
              const result = await restoreAllReminders();
              Alert.alert(
                'Tamam',
                result.updated > 0
                  ? `${result.updated} müşterinin gizlenmiş hatırlatması geri getirildi.`
                  : 'Gizlenmiş hatırlatma bulunamadı — zaten temiz.',
                [{ text: 'Tamam' }]
              );
            } catch (e) {
              Alert.alert(
                'Hata',
                e?.message || 'Hatırlatmalar geri yüklenemedi.',
                [{ text: 'Tamam' }],
                { tone: 'danger' }
              );
            } finally {
              setRestoring(false);
            }
          },
        },
      ],
      { tone: 'warning' }
    );
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Üst başlık paneli */}
        <View style={[styles.heroBlock, { paddingTop: (insets.top || 12) + 14 }]}>
          <Text style={styles.pageTitle}>Ayarlar</Text>
          <Text style={styles.pageSub}>Hesap · sürüm · platform</Text>
        </View>

        <View style={styles.content}>
          {/* Oturum */}
          <SectionHeader title="OTURUM" />
          <InfoRow label="Kullanıcı" value={user?.displayName || user?.username || '—'} />
          <InfoRow
            label="Rol"
            value={
              user?.role === 'admin' ? 'Yönetici'
              : user?.role === 'employee' ? 'Çalışan'
              : 'Kullanıcı'
            }
          />

          {/* Sürüm */}
          {versionInfo.bundledVersion && (
            <>
              <View style={styles.sectionSpacer} />
              <SectionHeader title="UYGULAMA SÜRÜMÜ" />
              <InfoRow label="Şu anki sürüm" value={versionInfo.bundledVersion} />
              {versionInfo.latestVersion && (
                <InfoRow
                  label="Sunucudaki son sürüm"
                  value={versionInfo.latestVersion}
                  valueColor={updateAvailable ? colors.gold : undefined}
                />
              )}
              <TouchableOpacity
                onPress={versionInfo.reload}
                activeOpacity={0.7}
                style={styles.reloadBtn}
              >
                <Text style={styles.reloadTxt}>
                  {updateAvailable ? '↻ Yeni Sürüme Güncelle' : '↻ Sürümü Yenile (cache temizle)'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.hint}>
                {updateAvailable
                  ? 'Yeni bir sürüm yayınlanmış. Güncelle butonuna tıklayarak hemen alabilirsin.'
                  : 'Uygulaman güncel. Yine de yenilemek istersen bu butona tıkla — tarayıcı cache\'i temizlenip sıfırdan yüklenir.'}
              </Text>
            </>
          )}

          {/* Platform */}
          <View style={styles.sectionSpacer} />
          <SectionHeader title="PLATFORM" />
          <InfoRow
            label="Çalışma ortamı"
            value={
              Platform.OS === 'web' ? 'Web / PWA'
              : Platform.OS === 'ios' ? 'iOS'
              : 'Android'
            }
          />

          {/* Hatırlatmalar */}
          <View style={styles.sectionSpacer} />
          <SectionHeader title="HATIRLATMALAR" subtitle="yanlışlıkla gizlediğin geri gelsin" />
          <TouchableOpacity
            onPress={handleRestoreReminders}
            activeOpacity={0.7}
            style={styles.restoreBtn}
            disabled={restoring}
          >
            <Text style={styles.restoreTxt}>
              {restoring ? '⏳ Geri yükleniyor…' : '↩ Silinen Hatırlatmaları Geri Yükle'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Yaklaşan Taksitler ve Hatırlatma listesinden gizlediğin tüm satırlar geri gelir. Müşteri veya ödeme silinmez.
          </Text>

          {/* Test müşterileri — geliştirme/senaryo test'i için */}
          <View style={styles.sectionSpacer} />
          <SectionHeader title="TEST" subtitle="senaryo testi için sahte müşteriler" />
          <TouchableOpacity
            onPress={handleCreateTests}
            activeOpacity={0.7}
            style={styles.testCreateBtn}
            disabled={testBusy !== null}
          >
            <Text style={styles.testCreateTxt}>
              {testBusy === 'create' ? '⏳ Ekleniyor…' : '➕ Test Müşterileri Ekle (TEST1..TEST6)'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteTests}
            activeOpacity={0.7}
            style={styles.testDeleteBtn}
            disabled={testBusy !== null}
          >
            <Text style={styles.testDeleteTxt}>
              {testBusy === 'delete' ? '⏳ Siliniyor…' : '🗑 Test Müşterilerini Sil'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            6 test müşterisi eklenir (hepsinin telefonu 05511009340). Yaklaşan Taksitler'de TEST1/2/3 (3 kademe ton), Hatırlatma'da TEST4/5/6 (Senaryo 2 ve 3) görünür.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionBar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 40 },

  heroBlock: {
    paddingHorizontal: 22,
    paddingBottom: 16,
    backgroundColor: 'rgba(92, 13, 20, 0.22)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 169, 97, 0.35)',
  },
  pageTitle: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  pageSub: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  content: { paddingHorizontal: 22, paddingTop: 20 },

  sectionSpacer: { height: 32 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 169, 97, 0.15)',
  },
  sectionBar: {
    width: 3,
    height: 18,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'lowercase',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },

  reloadBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(201,169,97,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.45)',
  },
  reloadTxt: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  restoreBtn: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(91, 168, 90, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(91, 168, 90, 0.40)',
  },
  restoreTxt: {
    color: colors.success,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  testCreateBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(201,169,97,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.40)',
    marginBottom: 8,
  },
  testCreateTxt: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  testDeleteBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(226,92,92,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(226,92,92,0.40)',
  },
  testDeleteTxt: {
    color: colors.danger,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
});
