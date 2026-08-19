import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Dropdown from '../components/ui/Dropdown';
import useCustomers from '../hooks/useCustomers';
import useDeviceType from '../hooks/useDeviceType';
import { computeReports, formatTLCompact, MONTH_LABELS_TR } from '../utils/reports';
import { colors } from '../theme/colors';

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export default function ReportsModule() {
  const { customers, loading } = useCustomers(500);
  const { isPhone } = useDeviceType();
  const insets = useSafeAreaInsets();

  const report = useMemo(() => computeReports(customers), [customers]);

  const monthName = MONTH_NAMES_TR[new Date().getMonth()];
  const collectionPct = Math.round(report.collectionRatio * 100);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

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

  const barData = useMemo(
    () =>
      yearMonthlySales.map((value, i) => ({
        value,
        label: MONTH_LABELS_TR[i],
        frontColor: i === selectedMonth ? colors.primary : colors.gold,
      })),
    [yearMonthlySales, selectedMonth]
  );

  const hasYearData = useMemo(
    () => yearMonthlySales.some((v) => v > 0),
    [yearMonthlySales]
  );

  const maxBarValue = useMemo(() => {
    const max = Math.max(...yearMonthlySales, 0);
    if (max <= 0) return 1000;
    return Math.ceil((max * 1.2) / 100) * 100;
  }, [yearMonthlySales]);

  const yAxisLabels = useMemo(() => {
    const step = maxBarValue / 4;
    return [0, step, step * 2, step * 3, step * 4].map(formatTLCompact);
  }, [maxBarValue]);

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Üst başlık paneli — Müşteriler ile tutarlı */}
        <View style={[styles.heroBlock, { paddingTop: (insets.top || 12) + 14 }]}>
          <Text style={styles.pageTitle}>Raporlar</Text>
          <Text style={styles.pageSub}>Dükkan analizi · {monthName}</Text>
        </View>

        <View style={styles.content}>
          {/* Özet — defter satırları */}
          <SectionHeader title="ÖZET" />
          <SummaryRow
            label="TOPLAM CİRO"
            sub="Tüm zamanlar"
            value={loading ? '…' : formatTLCompact(report.totalRevenue)}
            accent={colors.gold}
          />
          <SummaryRow
            label="BU AY"
            sub={monthName}
            value={loading ? '…' : formatTLCompact(report.monthRevenue)}
            accent={colors.primary}
          />
          <SummaryRow
            label="BEKLEYEN ALACAK"
            sub="Tahsil edilmemiş"
            value={loading ? '…' : formatTLCompact(report.pendingReceivable)}
            accent={colors.danger}
            valueColor={colors.danger}
          />
          <SummaryRow
            label="TAHSİL EDİLEN"
            sub={`%${collectionPct} tahsilat`}
            value={loading ? '…' : formatTLCompact(report.collectedAmount)}
            accent={colors.success}
            valueColor={colors.success}
          />

          {/* Aylık Ciro */}
          <View style={styles.sectionSpacer} />
          <SectionHeader title="AYLIK CİRO" subtitle={`${selectedYear} yılı satışları`} />

          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>YIL</Text>
              <Dropdown value={selectedYear} onChange={setSelectedYear} options={yearOptions} />
            </View>
            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>VURGULU AY</Text>
              <Dropdown value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} />
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
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>{selectedYear} yılında satış yok</Text>
              <Text style={styles.emptySub}>Farklı bir yıl seç ya da bu yıl için müşteri eklemeye başla.</Text>
            </View>
          )}

          {/* Tahsilat durumu */}
          <View style={styles.sectionSpacer} />
          <SectionHeader title="TAHSİLAT DURUMU" subtitle="para dağılımı" />

          {pieData ? (
            <View style={[styles.pieWrap, isPhone && styles.pieWrapPhone]}>
              <View style={styles.pieChartBox}>
                <PieChart
                  key={`pie-${report.collectedAmount}-${report.pendingReceivable}`}
                  data={pieData}
                  donut
                  radius={isPhone ? 80 : 100}
                  innerRadius={isPhone ? 50 : 65}
                  innerCircleColor={colors.bg}
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
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Henüz satış kaydı yok</Text>
              <Text style={styles.emptySub}>
                Müşteri eklemeye başlayınca tahsilat oranı burada görünecek.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryRow({ label, sub, value, accent, valueColor }) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryAccent, { backgroundColor: accent }]} />
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={[styles.summaryLabel, { color: accent }]}>{label}</Text>
        {!!sub && <Text style={styles.summarySub}>{sub}</Text>}
      </View>
      <Text
        style={[styles.summaryValue, valueColor && { color: valueColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 40 },

  // Üst başlık paneli
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

  // Bölüm başlığı
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

  // Özet satırı
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  summaryAccent: {
    width: 3,
    height: 32,
    borderRadius: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  summarySub: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginLeft: 8,
  },

  // Filtre satırı
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  filterCol: {
    flex: 1,
    minWidth: 120,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  chartBody: { paddingTop: 6, paddingRight: 6 },

  // Legend
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
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

  // Pie chart wrap
  pieWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 6,
  },
  pieWrapPhone: {
    flexDirection: 'column',
    gap: 14,
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

  pieLegend: {
    flex: 1,
    gap: 8,
    minWidth: 200,
  },
  pieLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  pieLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pieLegendLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.6,
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

  // Boş
  emptyBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center', lineHeight: 18 },
});
