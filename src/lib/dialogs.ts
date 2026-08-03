/** تنبيهات آمنة في Electron — تستعيد التركيز بعد الإغلاق */

function restoreFocus() {
  setTimeout(() => {
    try {
      window.focus();
      document.body.style.pointerEvents = 'auto';
      document.documentElement.style.pointerEvents = 'auto';
      // أزل أي طبقة شفافة عالقة إن وُجدت بالخطأ
      document.querySelectorAll('[data-app-overlay]').forEach(el => {
        if (!(el as HTMLElement).dataset.keep) (el as HTMLElement).style.pointerEvents = 'none';
      });
      if ((window as any).electronAPI?.focusWindow) {
        (window as any).electronAPI.focusWindow();
      }
      // إعادة تفعيل أول حقل ظاهر
      const input = document.querySelector('input:not([type=hidden]):not([readonly]), textarea, select') as HTMLElement | null;
      if (input) {
        // لا نُجبر التركيز دائماً — فقط نضمن أن الصفحة تستقبل النقرات
      }
    } catch {
      /* ignore */
    }
  }, 30);
}

export function appAlert(message: string): void {
  try {
    window.alert(message);
  } finally {
    restoreFocus();
  }
}

export function appConfirm(message: string): boolean {
  try {
    return window.confirm(message);
  } finally {
    restoreFocus();
  }
}
