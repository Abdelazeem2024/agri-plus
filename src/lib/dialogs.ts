/**
 * حوارات آمنة — في Electron تستخدم dialog النظامي عبر sendSync
 * ثم تعيد التركيز للنافذة (حل جذري لتجمد الإدخال)
 */

function restoreFocus() {
  setTimeout(() => {
    try {
      window.focus();
      document.body.style.pointerEvents = "auto";
      document.documentElement.style.pointerEvents = "auto";
      (window as any).electronAPI?.focusWindow?.();
    } catch { /* ignore */ }
  }, 30);
}

export function appAlert(message: string): void {
  try {
    const api = (window as any).electronAPI;
    if (api?.showMessageSync) {
      api.showMessageSync(String(message));
    } else {
      window.alert(String(message));
    }
  } finally {
    restoreFocus();
  }
}

export function appConfirm(message: string): boolean {
  try {
    const api = (window as any).electronAPI;
    if (api?.showConfirmSync) {
      return !!api.showConfirmSync(String(message));
    }
    return window.confirm(String(message));
  } finally {
    restoreFocus();
  }
}

export function closeDialog() {}
export function subscribeDialog(_fn: any) { return () => {}; }
