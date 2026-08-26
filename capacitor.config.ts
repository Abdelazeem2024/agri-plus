import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // نفس معرّف التطبيق (appId) المستخدم في نسخة سطح المكتب — يحافظ على هوية
  // واحدة للمنتج عبر المنصتين، ولا داعٍ لتغييره لاحقاً
  appId: 'com.agriplus.app',
  appName: 'Agri Plus',
  // مجلد الإخراج الذي ينتجه Vite بعد `npm run build` — نفس المجلد المستخدم
  // في تغليف Electron حالياً، Capacitor يعيد استخدامه مباشرة بدون تعديل
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    // يسمح بحركة/تأثيرات انتقالية أكثر سلاسة عند فتح التطبيق
    allowMixedContent: false
  }
};

export default config;
