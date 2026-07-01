// Cross-platform Alert — kendi tasarımlı modal kullanır (window.alert/confirm yerine).
// İmza React Native Alert.alert ile uyumlu: alert(title, message, buttons, options)
// options.tone: 'info' (default) | 'success' | 'warning' | 'danger'

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const Alert = {
  alert(title, message, buttons, options) {
    const payload = {
      title: title || '',
      message: message || '',
      buttons: Array.isArray(buttons) && buttons.length > 0
        ? buttons
        : [{ text: 'Tamam' }],
      tone: options?.tone || 'info',
    };
    listeners.forEach((fn) => fn(payload));
  },
};

export default Alert;
