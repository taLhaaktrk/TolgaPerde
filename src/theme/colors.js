// TolgaPerde — Dark Navy + Bordo gradient paleti.
// Referans: kullanıcının gönderdiği 3-kolon CRM screenshot'ı (2026-05-24).

export const colors = {
  // Zeminler — deep navy katmanları
  bg: '#0A1628',             // ana app zemini (en koyu)
  bgRail: '#0F1B30',         // sol rail
  bgPanel: '#152136',        // orta + sağ panel zemini
  bgCard: '#1B2940',         // kart zemini
  bgCardHi: '#243556',       // hover / aktif kart
  bgInput: '#0F1B30',        // input kutusu
  bgCanvas: '#FFFFFF',       // çizim canvas'ı (her zaman beyaz)

  // Metin
  textPrimary: '#FFFFFF',
  textSecondary: '#B8C5D6',
  textMuted: '#7888A3',
  textFaint: '#4F5F7C',
  textInverse: '#0A1628',

  // Borderlar
  border: '#243556',
  borderStrong: '#2F4570',
  borderSubtle: '#1B2940',

  // Marka — bordo (referansa sadık)
  primary: '#9C2530',
  primaryDark: '#7B1820',
  primaryDeep: '#5C0D14',
  primaryLight: '#C13141',
  primarySoft: 'rgba(156, 37, 48, 0.18)',

  // İkincil — altın aksanı (VIP, vurgu)
  gold: '#C9A961',
  goldLight: '#E5D29A',
  goldDark: '#8E7634',
  goldSoft: 'rgba(201, 169, 97, 0.15)',

  // Durum renkleri (koyu zemine ayarlı)
  success: '#5BA85A',
  successSoft: 'rgba(91, 168, 90, 0.15)',
  danger: '#E25C5C',
  dangerSoft: 'rgba(226, 92, 92, 0.18)',
  warning: '#F0A640',
  warningSoft: 'rgba(240, 166, 64, 0.15)',
  info: '#5B9DD9',
  infoSoft: 'rgba(91, 157, 217, 0.15)',
};

// Gradient stop dizileri — LinearGradient'a doğrudan geçer.
export const gradients = {
  appBg: ['#0A1628', '#0F1B30'],
  // Sol rail — moduleHeader ile aynı renk dünyası: bordo üst → navy alt
  sidebar: ['#5C0D14', '#7B1820', '#152136'],
  activeRail: ['#152136', '#243556', '#2F4570'], // koyu navy — paletteki bgPanel/bgCard tonları
  moduleHeader: ['#5C0D14', '#7B1820', '#152136'], // bordo → navy (orijinal)
  customerCard: ['#1B2940', '#243556'],
  heroCard: ['#5C0D14', '#9C2530', '#1B2940'],
  burgundyButton: ['#7B1820', '#9C2530'],
  goldButton: ['#C9A961', '#8E7634'],
  panelGlow: ['#152136', '#1B2940'],
  cardSubtle: ['rgba(27,41,64,0.6)', 'rgba(36,53,86,0.4)'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: '#9C2530',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 6,
  },
};
