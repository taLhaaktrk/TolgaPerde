import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Alert from '../utils/alert';
import {
  Canvas,
  Group,
  Path,
  Rect,
  Skia,
  Image as SkiaImage,
  useImage,
} from '@shopify/react-native-skia';
import {
  Gesture,
  GestureDetector,
  PointerType,
} from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import { updateCustomerMedia, SOURCE_CANVAS } from '../services/customerService';
import { useCustomer } from '../context/CustomerContext';
import { useAppShell } from '../context/AppShellContext';
import NewCustomerModal from './customers/NewCustomerModal';
import { colors, gradients, radii, spacing } from '../theme/colors';

const GRID_HALF = 5000;
const GRID_SIZE = 24;
const PEN_WIDTH = 2.5;
const ERASER_WIDTH = 28;
const RECT_STROKE_WIDTH = 2.5;

const TOOL_PEN = 'pen';
const TOOL_RECT = 'rect';
const TOOL_ERASER = 'eraser';

const COLOR_PALETTE = [
  { id: 'blue', value: '#1A73E8' },
  { id: 'red', value: '#D32F2F' },
  { id: 'black', value: '#1F2328' },
  { id: 'green', value: '#2E7D32' },
  { id: 'burgundy', value: '#7B1820' },
  { id: 'gold', value: '#B8860B' },
  { id: 'purple', value: '#7B1FA2' },
  { id: 'orange', value: '#F57C00' },
];

function buildSkPath(points) {
  const p = Skia.Path.Make();
  if (!points.length) return p;
  p.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) p.lineTo(points[i].x, points[i].y);
  return p;
}

function StrokeShape({ shape }) {
  const skPath = useMemo(() => buildSkPath(shape.points), [shape.points]);
  return (
    <Path
      path={skPath}
      color={shape.color}
      strokeWidth={shape.strokeWidth}
      style="stroke"
      strokeCap="round"
      strokeJoin="round"
      blendMode={shape.eraser ? 'clear' : 'srcOver'}
    />
  );
}

function RectShape({ shape }) {
  return (
    <Rect
      x={Math.min(shape.x, shape.x + shape.width)}
      y={Math.min(shape.y, shape.y + shape.height)}
      width={Math.abs(shape.width)}
      height={Math.abs(shape.height)}
      color={shape.color}
      style="stroke"
      strokeWidth={shape.strokeWidth}
    />
  );
}

function renderShape(shape, key) {
  if (shape.type === 'rect') return <RectShape key={key} shape={shape} />;
  return <StrokeShape key={key} shape={shape} />;
}

function GridBackground() {
  const lines = useMemo(() => {
    const p = Skia.Path.Make();
    for (let x = -GRID_HALF; x <= GRID_HALF; x += GRID_SIZE) {
      p.moveTo(x, -GRID_HALF);
      p.lineTo(x, GRID_HALF);
    }
    for (let y = -GRID_HALF; y <= GRID_HALF; y += GRID_SIZE) {
      p.moveTo(-GRID_HALF, y);
      p.lineTo(GRID_HALF, y);
    }
    return p;
  }, []);
  return <Path path={lines} color="#E1E5EA" strokeWidth={1} style="stroke" />;
}

export default function DrawingPanel({ onSaved }) {
  const customer = useCustomer();
  const { activeCustomer, setActiveCustomer, clearActiveCustomer } = useAppShell();

  const [tool, setTool] = useState(TOOL_PEN);
  const [color, setColor] = useState(COLOR_PALETTE[0].value);
  const [completedShapes, setCompletedShapes] = useState([]);
  const [currentShape, setCurrentShape] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [fingerDraw, setFingerDraw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [pendingSaveAfterModal, setPendingSaveAfterModal] = useState(false);
  const [editUnlocked, setEditUnlocked] = useState(false);

  // Müşteri canvas görselini yükle (varsa)
  const loadedImage = useImage(activeCustomer?.mediaUrl || null);

  const toolRef = useRef(tool); toolRef.current = tool;
  const colorRef = useRef(color); colorRef.current = color;
  const fingerDrawRef = useRef(fingerDraw); fingerDrawRef.current = fingerDraw;
  const offsetRef = useRef(offset); offsetRef.current = offset;
  const scaleRef = useRef(scale); scaleRef.current = scale;
  const editUnlockedRef = useRef(editUnlocked); editUnlockedRef.current = editUnlocked;
  const hasLoadedImageRef = useRef(false); hasLoadedImageRef.current = !!loadedImage;

  const currentShapeRef = useRef(null);
  const drawingRef = useRef(false);
  const panningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const pinchStartScaleRef = useRef(1);
  const pinchStartOffsetRef = useRef({ x: 0, y: 0 });
  const pinchStartFocalRef = useRef({ x: 0, y: 0 });
  const canvasContainerRef = useRef(null);

  // Aktif müşteri değişince: çizimleri sıfırla, kilidi tekrar tak (yeni image gelmiş olabilir).
  useEffect(() => {
    setCompletedShapes([]);
    setCurrentShape(null);
    currentShapeRef.current = null;
    setEditUnlocked(false);
    setOffset({ x: 0, y: 0 });
    setScale(1);
  }, [activeCustomer?.id]);

  // Kilit aktif mi? — kayıtlı görsel var ve kullanıcı kilidi açmadıysa.
  const isLocked = !!loadedImage && !editUnlocked;

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .averageTouches(false)
    .maxPointers(1)
    .onBegin((e) => {
      const isStylus = e.pointerType === PointerType.STYLUS;
      const shouldDraw = isStylus || fingerDrawRef.current;
      // Görsel kilitli + çizmek istiyorsa engelle (pan'a izin ver).
      if (shouldDraw && hasLoadedImageRef.current && !editUnlockedRef.current) {
        return;
      }
      if (shouldDraw) {
        const cx = (e.x - offsetRef.current.x) / scaleRef.current;
        const cy = (e.y - offsetRef.current.y) / scaleRef.current;
        const t = toolRef.current;
        let shape;
        if (t === TOOL_RECT) {
          shape = { type: 'rect', x: cx, y: cy, width: 0, height: 0, color: colorRef.current, strokeWidth: RECT_STROKE_WIDTH };
        } else if (t === TOOL_ERASER) {
          shape = { type: 'stroke', points: [{ x: cx, y: cy }], color: '#000000', strokeWidth: ERASER_WIDTH, eraser: true };
        } else {
          shape = { type: 'stroke', points: [{ x: cx, y: cy }], color: colorRef.current, strokeWidth: PEN_WIDTH, eraser: false };
        }
        currentShapeRef.current = shape;
        setCurrentShape(shape);
        drawingRef.current = true;
      } else {
        panStartRef.current = { x: offsetRef.current.x, y: offsetRef.current.y };
        panningRef.current = true;
      }
    })
    .onUpdate((e) => {
      if (drawingRef.current && currentShapeRef.current) {
        const cx = (e.x - offsetRef.current.x) / scaleRef.current;
        const cy = (e.y - offsetRef.current.y) / scaleRef.current;
        const shape = currentShapeRef.current;
        let updated;
        if (shape.type === 'rect') {
          updated = { ...shape, width: cx - shape.x, height: cy - shape.y };
        } else {
          updated = { ...shape, points: [...shape.points, { x: cx, y: cy }] };
        }
        currentShapeRef.current = updated;
        setCurrentShape(updated);
      } else if (panningRef.current) {
        setOffset({
          x: panStartRef.current.x + e.translationX,
          y: panStartRef.current.y + e.translationY,
        });
      }
    })
    .onEnd(() => {
      if (drawingRef.current && currentShapeRef.current) {
        const finalized = currentShapeRef.current;
        currentShapeRef.current = null;
        setCompletedShapes((prev) => [...prev, finalized]);
        setCurrentShape(null);
        drawingRef.current = false;
      }
      panningRef.current = false;
    });

  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onBegin((e) => {
      pinchStartScaleRef.current = scaleRef.current;
      pinchStartOffsetRef.current = { ...offsetRef.current };
      pinchStartFocalRef.current = { x: e.focalX, y: e.focalY };
    })
    .onUpdate((e) => {
      const newScale = Math.max(0.3, Math.min(pinchStartScaleRef.current * e.scale, 4));
      const r = newScale / pinchStartScaleRef.current;
      const fx = pinchStartFocalRef.current.x;
      const fy = pinchStartFocalRef.current.y;
      setScale(newScale);
      setOffset({
        x: fx * (1 - r) + r * pinchStartOffsetRef.current.x,
        y: fy * (1 - r) + r * pinchStartOffsetRef.current.y,
      });
    });

  const gesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const clearCanvas = () => {
    if (!completedShapes.length && !currentShape) return;
    Alert.alert('Çizimi Temizle?', 'Tuvaldeki tüm yeni çizimler silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, Temizle',
        style: 'destructive',
        onPress: () => {
          setCompletedShapes([]);
          setCurrentShape(null);
          currentShapeRef.current = null;
        },
      },
    ]);
  };

  const recenter = () => {
    setOffset({ x: 0, y: 0 });
    setScale(1);
  };

  const handleUnlock = () => {
    if (editUnlocked) {
      // Tekrar kilitle
      setEditUnlocked(false);
      return;
    }
    Alert.alert(
      'Çizimi Düzenle?',
      `${activeCustomer?.fullName || 'Bu müşteri'} için zaten kayıtlı bir çizim var. Üstüne yeni çizimler ekleyebilirsin.\n\nKaydedince eski çizim eski haline GERİ DÖNMEZ.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Üstüne Çiz', style: 'destructive', onPress: () => setEditUnlocked(true) },
      ]
    );
  };

  const doSaveCanvas = async () => {
    if (!activeCustomer?.id) return;
    if (!completedShapes.length && !loadedImage) {
      Alert.alert('Boş sayfa', 'Kaydedilecek bir çizim yok.');
      return;
    }
    setSaving(true);
    try {
      const uri = await captureRef(canvasContainerRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const { url, path } = await updateCustomerMedia(
        activeCustomer.id,
        uri,
        'image/png',
        SOURCE_CANVAS
      );
      setActiveCustomer({
        ...activeCustomer,
        mediaUrl: url,
        mediaPath: path,
        source: SOURCE_CANVAS,
      });
      Alert.alert(
        'Kaydedildi',
        `${activeCustomer.fullName} için çizim kaydedildi.`,
        [
          {
            text: 'Tamam',
            onPress: () => {
              setCompletedShapes([]);
              setCurrentShape(null);
              currentShapeRef.current = null;
              setEditUnlocked(false);
              onSaved?.();
            },
          },
        ]
      );
    } catch (e) {
      console.warn('Canvas kaydı hatası:', e);
      Alert.alert('Kayıt sorunu', e.message || 'Görsel yüklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  // TEK Kaydet butonu — müşteri yoksa önce modal, sonra otomatik canvas kayıt.
  const handleSavePressed = () => {
    if (!completedShapes.length && !loadedImage) {
      Alert.alert('Boş sayfa', 'Kaydedilecek bir çizim yok.');
      return;
    }
    if (!activeCustomer?.id) {
      // Modal aç + sonra canvas otomatik kaydet
      setPendingSaveAfterModal(true);
      setCustomerModalOpen(true);
      return;
    }
    doSaveCanvas();
  };

  const handleCustomerSaved = (result) => {
    if (result?.customerDoc) {
      setActiveCustomer(result.customerDoc);
    }
    if (pendingSaveAfterModal) {
      setPendingSaveAfterModal(false);
      // Customer aktif olduktan sonra canvas'ı kaydet
      setTimeout(() => doSaveCanvas(), 250);
    }
  };

  const handleModalClose = () => {
    setCustomerModalOpen(false);
    // Kullanıcı modal'ı iptal ettiyse pending save'i de iptal et
    setPendingSaveAfterModal(false);
  };

  const visibleShapes = currentShape ? [...completedShapes, currentShape] : completedShapes;

  return (
    <View style={styles.wrap}>
      {/* Üst toolbar */}
      <View style={styles.toolbarTop}>
        <View style={styles.toolGroup}>
          <ShapeBtn label="Kalem" active={tool === TOOL_PEN} onPress={() => setTool(TOOL_PEN)} />
          <ShapeBtn label="Dikdörtgen" active={tool === TOOL_RECT} onPress={() => setTool(TOOL_RECT)} />
          <ShapeBtn label="Silgi" active={tool === TOOL_ERASER} onPress={() => setTool(TOOL_ERASER)} />
        </View>

        <View style={styles.toolGroup}>
          <View style={styles.fingerToggle}>
            <Text style={styles.fingerLabel}>Parmakla{'\n'}çiz</Text>
            <Switch
              value={fingerDraw}
              onValueChange={setFingerDraw}
              trackColor={{ false: colors.borderStrong, true: colors.gold }}
              thumbColor={fingerDraw ? colors.primaryDeep : colors.bgInput}
            />
          </View>
          <TouchableOpacity style={styles.utilityBtn} onPress={recenter}>
            <Text style={styles.utilityTxt}>Merkez</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.utilityBtn, styles.clearBtn]} onPress={clearCanvas}>
            <Text style={[styles.utilityTxt, styles.clearTxt]}>Temizle</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Renk paleti */}
      <View style={styles.palette}>
        {COLOR_PALETTE.map((c) => {
          const selected = color === c.value && tool !== TOOL_ERASER;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => { setColor(c.value); if (tool === TOOL_ERASER) setTool(TOOL_PEN); }}
              style={[
                styles.swatch,
                { backgroundColor: c.value },
                selected && styles.swatchActive,
              ]}
              activeOpacity={0.7}
            />
          );
        })}
        <Text style={styles.hint}>
          {fingerDraw ? 'Parmak çiziyor' : 'Pencil çizer · Parmak kaydırır · İki parmak zoom'}
        </Text>
      </View>

      {/* Müşteri durum pill — canvas üstünde */}
      <View style={styles.customerPillRow}>
        {activeCustomer ? (
          <View style={[styles.customerPill, styles.customerPillActive]}>
            <Text style={styles.customerPillTxt} numberOfLines={1}>
              Aktif:  <Text style={{ fontWeight: '900' }}>{activeCustomer.fullName}</Text>
            </Text>
            <TouchableOpacity onPress={() => setCustomerModalOpen(true)} style={styles.pillIcon}>
              <Text style={styles.pillIconTxt}>Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearActiveCustomer} style={styles.pillIconClose}>
              <Text style={styles.pillIconCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.customerPill, styles.customerPillEmpty]}
            onPress={() => setCustomerModalOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.customerPillEmptyTxt}>
              Müşteri seçilmedi · Eklemek için dokun (ya da Kaydet'e bas)
            </Text>
          </TouchableOpacity>
        )}

        {/* Kayıtlı görsel varsa kilit/aç butonu */}
        {loadedImage && (
          <TouchableOpacity
            style={[styles.lockBtn, editUnlocked && styles.lockBtnUnlocked]}
            onPress={handleUnlock}
            activeOpacity={0.7}
          >
            <Text style={[styles.lockBtnTxt, editUnlocked && styles.lockBtnTxtUnlocked]}>
              {editUnlocked ? 'Düzenleniyor' : 'Üstüne Çiz'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Canvas */}
      <View ref={canvasContainerRef} collapsable={false} style={styles.canvasWrap}>
        <GestureDetector gesture={gesture}>
          <Canvas style={styles.canvas}>
            <Group transform={[
              { translateX: offset.x },
              { translateY: offset.y },
              { scale: scale },
            ]}>
              <GridBackground />
              {loadedImage && (
                <SkiaImage
                  image={loadedImage}
                  x={0}
                  y={0}
                  width={loadedImage.width()}
                  height={loadedImage.height()}
                />
              )}
              <Group layer>
                {visibleShapes.map((s, i) => renderShape(s, `s-${i}`))}
              </Group>
            </Group>
          </Canvas>
        </GestureDetector>
        <View style={styles.posInfo}>
          <Text style={styles.posTxt}>
            {Math.round(scale * 100)}%  ·  Konum: {Math.round(-offset.x)}, {Math.round(-offset.y)}
          </Text>
        </View>
        {isLocked && (
          <View style={styles.lockedBanner} pointerEvents="none">
            <Text style={styles.lockedBannerTxt}>
              Kayıtlı çizim · Üstüne yazmak için sağ üstteki butona dokun
            </Text>
          </View>
        )}
      </View>

      {/* TEK büyük kaydet butonu */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleSavePressed}
        disabled={saving}
        style={{ marginTop: spacing.md }}
      >
        <LinearGradient
          colors={gradients.goldButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryDeep} />
          ) : (
            <Text style={styles.saveBtnText}>
              {activeCustomer ? 'SAYFAYI KAYDET' : 'MÜŞTERİ EKLE & KAYDET'}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <NewCustomerModal
        visible={customerModalOpen}
        onClose={handleModalClose}
        onSaved={handleCustomerSaved}
      />
    </View>
  );
}

function ShapeBtn({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.shapeBtn, active && styles.shapeBtnActive]}
      activeOpacity={0.7}
    >
      <Text style={[styles.shapeLabel, active && styles.shapeLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },

  toolbarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  toolGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },

  shapeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    minWidth: 70,
  },
  shapeBtnActive: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  shapeIcon: { fontSize: 18, color: colors.textSecondary },
  shapeIconActive: { color: colors.gold },
  shapeLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: '700' },
  shapeLabelActive: { color: colors.gold },

  fingerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  fingerLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', textAlign: 'right' },

  utilityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  utilityTxt: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  clearBtn: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(226,92,92,0.4)' },
  clearTxt: { color: colors.danger },

  palette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 8,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: colors.textPrimary,
    transform: [{ scale: 1.18 }],
  },
  hint: {
    marginLeft: 'auto',
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },

  customerPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  customerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
  },
  customerPillActive: {
    backgroundColor: colors.bgCard,
    borderColor: colors.gold,
  },
  customerPillEmpty: {
    backgroundColor: colors.bgInput,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
  },
  customerPillTxt: { flex: 1, color: colors.textPrimary, fontSize: 13 },
  customerPillEmptyTxt: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  pillIcon: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  pillIconTxt: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  pillIconClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIconCloseTxt: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },

  lockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(240,166,64,0.5)',
  },
  lockBtnUnlocked: {
    backgroundColor: colors.successSoft,
    borderColor: 'rgba(91,168,90,0.5)',
  },
  lockBtnTxt: { color: colors.warning, fontWeight: '800', fontSize: 12 },
  lockBtnTxtUnlocked: { color: colors.success },

  canvasWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.bgCanvas,
    overflow: 'hidden',
    position: 'relative',
  },
  canvas: { flex: 1 },
  posInfo: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  posTxt: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },

  lockedBanner: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  lockedBannerTxt: { color: colors.warning, fontWeight: '700', fontSize: 11 },

  saveBtn: {
    paddingVertical: 18,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: colors.primaryDeep, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});
