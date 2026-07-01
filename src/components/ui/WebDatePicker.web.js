import React from 'react';

// Web/Electron için DateTimePicker stub'ı.
// iOS Safari + PWA'da JS ile showPicker() çağırmak user gesture chain'i kırar
// → picker açılmaz. Çözüm: input'u parent'a OVERLAY olarak yerleştir, opacity:0
// + cursor:pointer ile görünmez ama tıklanabilir. Kullanıcı butona dokununca
// aslında input'a dokunur, native picker direkt user gesture'la açılır.
//
// Kullanım (NewCustomerModal):
//   <View style={{ position: 'relative' }}>
//     <TouchableOpacity>...visual date button...</TouchableOpacity>
//     <DateTimePicker value={date} onChange={...} maximumDate={...} />
//   </View>
//
// Bu pattern hem onChange'i tetikler hem de tüm tarayıcılarda çalışır.
export default function DateTimePicker({ value, onChange, maximumDate, minimumDate }) {
  const toIso = (d) => {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return (
    <input
      type="date"
      value={toIso(value)}
      max={maximumDate ? toIso(maximumDate) : undefined}
      min={minimumDate ? toIso(minimumDate) : undefined}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) {
          onChange?.({ type: 'dismissed' });
          return;
        }
        const [y, m, d] = v.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        onChange?.({ type: 'set' }, date);
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        cursor: 'pointer',
        // iOS Safari için özel: pointer-events varsayılan, dokunabilir
        // (eski kodda pointerEvents: 'none' vardı, o yüzden hiç çalışmıyordu)
        border: 'none',
        outline: 'none',
        background: 'transparent',
      }}
    />
  );
}
