import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import ModuleHeader from '../components/shell/ModuleHeader';
import Dropdown from '../components/ui/Dropdown';
import useCustomers from '../hooks/useCustomers';
import useDeviceType from '../hooks/useDeviceType';
import { computeReports, formatTLCompact, MONTH_LABELS_TR } from '../utils/reports';
import { colors, gradients, spacing, radii, shadows } from '../theme/colors';

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export default function ReportsModule() {
  const { customers, loading } = useCustomers(500);
  const { isPhone } = useDeviceType();

  const report = useMemo(() => computeReports(customers), [customers]);

  const monthName = MONTH_NAMES_TR[new Date().getMonth()];
  const collectionPct = Math.round(report.collectionRatio * 100);

  // Yıl + ay seçicileri — varsayılan bugünün yıl/ayı
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Veride bulunan tüm yıllar — dropdown opsiyonları (en yeni üstte)
  const availableYears = useMemo(() => {
    const set = new Set([new Date().getFullYear()]);
    for (const c of customers) {
      const ref =
        c.orderDate?.toDate?.() ||
        c.createdAt?.toDate?.() ||
        (c.orderDate instanceof Date ? c.orderDate : null);
      if (ref) set.add(ref.getFullYear());
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [customers]);

  const yearOptions = useMemo(
    () => availableYears.map((y) => ({ label: String(y), value: y })),
    [availableYears]
  );

  const monthOptions = useMemo(
    () => MONTH_NAMES_TR.map((name, i) => ({ label: name, value: i })),
    []
  );

  // Seçili yıla göre aylık satış toplamları (12 ay)
  const yearMonthlySales = useMemo(() => {
    const sums = new Array(12).fill(0);
    for (const c of customers) {
      const ref =
        c.orderDate?.toDate?.() ||
        c.createdAt?.toDate?.() ||
        (c.orderDate instanceof Date ? c.orderDate : null);
      if (!ref || ref.getFullYear() !== selectedYear) continue;
      sums[ref.getMonth()] += Number(c.totalAmount) || 0;
    }
    return sums;
  }, [customers, selectedYear]);

  // Bar chart verisi — seçili ay bordo vurgulu, diğerleri altın
  const barData = useMemo(
    () =>
      yearMonthlySales.map((value, i) => ({
        value,
        label: MONTH_LABELS_TR[i],
        frontColor: i === selectedMonth ? colors.primary : colors.gold,
      })),
    [yearMonthlySales, selectedMonth]
  );

  // Seçili yılda hiç satış var mı? — bar chart empty state için
  const hasYearData = useMemo(
    () => yearMonthlySales.some((v) => v > 0),
    [yearMonthlySales]
  );

  // Bar chart Y-axis max + label dizisi (precomputed — function prop'undan daha güvenilir)
  const maxBarValue = useMemo(() => {
    const max = Math.max(...yearMonthlySales, 0);
    if (max <= 0) return 1000;
    return Math.ceil((max * 1.2) / 100) * 100;
  }, [yearMonthlySales]);

  const yAxisLabels = useMemo(() => {
    const step = maxBarValue / 4;
    return [0, step, step * 2, step * 3, step * 4].map(formatTLCompact);
  }, [maxBarValue]);

  // Pie chart verisi — tahsil edilen vs bekleyen
  // showGradient YOK: web'de SVG radialGradient bug'ı patlamaması için solid renkler.
  const pieData = useMemo(() => {
    const total = (report.collectedAmount || 0) + (report.pendingReceivable || 0);
    if (total <= 0) return null;
    return [
      { value: report.collectedAmount || 0, color: colors.success },
      { value: report.pendingReceivable || 0, color: colors.danger },
    ];
  }, [report.collectedAmount, report.pendingReceivable]);

  return (
    <View style={styles.flex}>
      <ModuleHeader
        eyebrow="DÜKKAN ANALİZİ"
        title="Raporlar"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.cardsGrid, isPhone && styles.cardsGridPhone]}>
          <SummaryCard
            label="TOPLAM CİRO"
            value={loading ? '…' : formatTLCompact(report.totalRevenue)}
            sub="Tüm zamanlar"
            accent={colors.gold}
            accentSoft={colors.goldSoft}
            isPhone={isPhone}
          />
          <SummaryCard
            label="BU AY"
            value={loading ? '…' : formatTLCompact(report.monthRevenue)}
            sub={monthName}
            accent={colors.primary}
            accentSoft={colors.primarySoft}
            isPhone={isPhone}
          />
          <SummaryCard
            label="BEKLEYEN ALACAK"
            value={loading ? '…' : formatTLCompact(report.pendingReceivable)}
            sub="Tahsil edilmemiş"
            accent={colors.danger}
            accentSoft={colors.dangerSoft}
            isPhone={isPhone}
          />
          <SummaryCard
            label="TAHSİL EDİLEN"
            value={loading ? '…' : formatTLCompact(report.collectedAmount)}
            sub={`%${collectionPct} tahsilat`}
            accent={colors.success}
            accentSoft={colors.successSoft}
            isPhone={isPhone}
          />
        </View>

        {/* 📊 Aylık Ciro — Bar Chart */}
        <View style={[styles.chartCard, shadows.md]}>
          <LinearGradient
            colors={gradients.cardSubtle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.chartHeader}>
            <Text style={styles.chartEyebrow}>AYLIK CİRO</Text>
            <Text style={styles.chartTitle}>{selectedYear} Yılı Satışları</Text>
          </View>

          {/* Yıl + Ay seçicileri */}
          <View style={[styles.filterRow, isPhone && styles.filterRowPhone]}>
            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>YIL</Text>
              <Dropdown
                value={selectedYear}
                onChange={setSelectedYear}
                options={yearOptions}
              />
            </View>
            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>VURGULU AY</Text>
              <Dropdown
                value={selectedMonth}
                onChange={setSelectedMonth}
                options={monthOptions}
              />
            </View>
          </View>

          {hasYearData ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chartBody}
              >
                <BarChart
                  key={`bar-${selectedYear}-${selectedMonth}-${maxBarValue}`}
                  data={barData}
                  barWidth={isPhone ? 18 : 26}
                  spacing={isPhone ? 10 : 16}
                  height={220}
                  roundedTop
                  hideRules
                  barBorderRadius={3}
                  xAxisColor={colors.borderStrong}
                  yAxisColor={colors.borderStrong}
                  xAxisLabelTextStyle={{
                    color: colors.textMuted,
                    fontSize: 10,
                    fontWeight: '700',
                  }}
                  yAxisTextStyle={{ color: colors.textMuted, fontSize: 9 }}
                  noOfSections={4}
                  maxValue={maxBarValue}
                  yAxisLabelTexts={yAxisLabels}
                />
              </ScrollView>

              <View style={styles.legendRow}>
                <LegendDot color={colors.primary} label={`Seçili Ay (${MONTH_NAMES_TR[selectedMonth]})`} />
                <LegendDot color={colors.gold} label="Diğer Aylar" />
              </View>
            </>
          ) : (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyTitle}>
                {selectedYear} yılında satış yok
              </Text>
              <Text style={styles.chartEmptySub}>
                Farklı bir yıl seç ya da bu yıl için müşteri eklemeye başla.
              </Text>
            </View>
          )}
        </View>

        {/* 🥧 Tahsilat Durumu — Pie Chart */}
        <View style={[styles.chartCard, shadows.md, { marginTop: spacing.xl }]}>
          <LinearGradient
            colors={gradients.cardSubtle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.chartHeader}>
            <Text style={styles.chartEyebrow}>TAHSİLAT DURUMU</Text>
            <Text style={styles.chartTitle}>Para Dağılımı</Text>
          </View>

          {pieData ? (
            <View style={[styles.pieWrap, isPhone && styles.pieWrapPhone]}>
              <View style={styles.pieChartBox}>
                <PieChart
                  key={`pie-${report.collectedAmount}-${report.pendingReceivable}`}
                  data={pieData}
                  donut
                  radius={isPhone ? 80 : 100}
                  innerRadius={isPhone ? 50 : 65}
                  innerCircleColor={colors.bgCard}
                  centerLabelComponent={() => (
                    <View style={styles.pieCenter}>
                      <Text style={styles.pieCenterPct}>%{collectionPct}</Text>
                      <Text style={styles.pieCenterSub}>tahsilat</Text>
                    </View>
                  )}
                />
              </View>

              <View style={styles.pieLegend}>
                <PieLegendRow
                  color={colors.success}
                  label="Tahsil Edilen"
                  value={formatTLCompact(report.collectedAmount)}
                  pct={collectionPct}
                />
                <PieLegendRow
                  color={colors.danger}
                  label="Bekleyen Alacak"
                  value={formatTLCompact(report.pendingReceivable)}
                  pct={100 - collectionPct}
                />
              </View>
            </View>
          ) : (
            <View style={styles.pieEmpty}>
              <Text style={styles.pieEmptyTitle}>Henüz satış kaydı yok</Text>
              <Text style={styles.pieEmptySub}>
                Müşteri eklemeye başlayınca tahsilat oranı burada görünecek.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function LegendDot({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDotBox, { backgroundColor: color }]} />
      <Text style={styles.legendTxt}>{label}</Text>
    </View>
  );
}

function PieLegendRow({ color, label, value, pct }) {
  return (
    <View style={styles.pieLegendRow}>
      <View style={[styles.pieLegendDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.pieLegendLabel}>{label}</Text>
        <Text style={styles.pieLegendValue}>{value}</Text>
      </View>
      <Text style={[styles.pieLegendPct, { color }]}>%{pct}</Text>
    </View>
  );
}

function SummaryCard({ label, value, sub, accent, accentSoft, isPhone }) {
  return (
    <View style={[styles.card, isPhone && styles.cardPhone, shadows.md]}>
      <LinearGradient
        colors={gradients.cardSubtle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={[styles.iconDot, { backgroundColor: accentSoft, borderColor: accent }]}>
        <View style={[styles.iconDotInner, { backgroundColor: accent }]} />
      </View>
      <Text style={[styles.cardLabel, isPhone && styles.cardLabelPhone, { color: accent }]}>
        {label}
      </Text>
      <Text
        style={[styles.cardValue, isPhone && styles.cardValuePhone]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {value}
      </Text>
      <Text style={[styles.cardSub, isPhone && styles.cardSubPhone]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },

  // Geniş ekran: 4 kart yatay
  cardsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  // Telefon: 2x2 grid, flex-wrap
  cardsGridPhone: {
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },

  card: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    minHeight: 140,
  },
  // Telefonda 2 kart yan yana — flexBasis ~%48 (gap için pay bırakır)
  cardPhone: {
    flex: 0,
    minWidth: '47%',
    maxWidth: '49%',
    minHeight: 110,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },

  // Sol kenar accent çubuğu
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  // Sağ üst köşe ikon noktası (renkli daire)
  iconDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  cardLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  cardLabelPhone: {
    fontSize: 9,
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    letterSpacing: 0.3,
  },
  cardValuePhone: {
    fontSize: 18,
    marginTop: 4,
  },
  cardSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  cardSubPhone: {
    fontSize: 10,
    marginTop: 2,
  },

  // Grafik kart konteyneri (bar + pie ortak)
  chartCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  chartHeader: { marginBottom: spacing.md },
  chartEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.gold,
    letterSpacing: 1.6,
  },
  chartTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  chartBody: {
    paddingTop: spacing.sm,
    paddingRight: spacing.sm,
  },

  // Yıl + Ay filtre satırı
  filterRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  filterRowPhone: {
    flexWrap: 'wrap',
  },
  filterCol: {
    flex: 1,
    minWidth: 130,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  // Bar chart altı legend
  legendRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDotBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendTxt: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  // Pie chart bloğu — geniş ekran: yan yana, telefon: alt alta
  pieWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  pieWrapPhone: {
    flexDirection: 'column',
    gap: spacing.lg,
  },
  pieChartBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenter: { alignItems: 'center' },
  pieCenterPct: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.gold,
    letterSpacing: 0.5,
  },
  pieCenterSub: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
  },

  // Pie legend (sağ taraf / alt)
  pieLegend: {
    flex: 1,
    gap: spacing.md,
    minWidth: 200,
  },
  pieLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  pieLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pieLegendLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  pieLegendValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '800',
    marginTop: 2,
  },
  pieLegendPct: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Empty state — bar chart + pie chart ortak
  pieEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  pieEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  pieEmptySub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  chartEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  chartEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  chartEmptySub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
});
