import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { MessageCircle, Facebook, X, Copy, Check, ExternalLink, ArrowRight } from 'lucide-react';
import facebookPageImg from '../assets/brand/facebook-page.png';

const WHATSAPP_NUMBER_DISPLAY = '01037235921';
const FACEBOOK_PAGE_NAME = 'برنامج Barnamgak';
const FACEBOOK_PAGE_URL = 'https://www.facebook.com/share/1BVcf9gnmD/';

export default function Layout() {
  const [showAbout, setShowAbout] = useState(false);
  const [aboutView, setAboutView] = useState<'main' | 'facebook'>('main');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unlock = () => {
      document.body.style.pointerEvents = 'auto';
      document.documentElement.style.pointerEvents = 'auto';
    };
    window.addEventListener('focus', unlock);
    document.addEventListener('click', unlock, true);
    return () => {
      window.removeEventListener('focus', unlock);
      document.removeEventListener('click', unlock, true);
    };
  }, []);

  const closeAbout = () => {
    setShowAbout(false);
    setAboutView('main');
    setCopied(false);
  };

  const handleCopyWhatsapp = async () => {
    try {
      await navigator.clipboard.writeText(WHATSAPP_NUMBER_DISPLAY);
    } catch {
      // بديل احتياطي في حال عدم توفر Clipboard API
      const el = document.createElement('textarea');
      el.value = WHATSAPP_NUMBER_DISPLAY;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
        {/* شريط سفلي */}
        <footer className="shrink-0 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-end bg-surface/80">
          <button
            type="button"
            onClick={() => setShowAbout(true)}
            className="group relative text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-secondary transition-colors"
          >
            <span className="relative z-10">
              Developed by{' '}
              <span className="font-bold text-cyan-500 dark:text-cyan-400 raqnova-glow">Raqnova</span>
            </span>
            <span className="raqnova-ray pointer-events-none absolute inset-0 overflow-hidden rounded" aria-hidden />
          </button>
        </footer>
      </div>

      {showAbout && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={closeAbout}>
          <div
            className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-600 relative"
            onClick={e => e.stopPropagation()}
          >
            <button type="button" onClick={closeAbout} className="absolute left-3 top-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <X className="w-5 h-5 text-slate-400" />
            </button>

            {aboutView === 'main' && (
              <div className="flex flex-col items-center text-center space-y-4 pt-2">
                <img src="./raqnova-logo.png" alt="Raqnova" className="w-28 h-28 object-contain" />
                <div>
                  <h3 className="text-xl font-bold text-cyan-500 dark:text-cyan-400">Raqnova</h3>
                  <p className="text-xs text-slate-500 mt-1">Smart Software Solutions</p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyWhatsapp}
                  className="flex items-center gap-2 w-full justify-center bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-medium transition-colors"
                >
                  {copied ? <Check className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                  <span>{copied ? 'تم نسخ الرقم' : WHATSAPP_NUMBER_DISPLAY}</span>
                  {!copied && <Copy className="w-4 h-4 opacity-80" />}
                </button>

                <button
                  type="button"
                  onClick={() => setAboutView('facebook')}
                  className="flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                  فيسبوك
                </button>
              </div>
            )}

            {aboutView === 'facebook' && (
              <div className="flex flex-col items-center text-center space-y-4 pt-2">
                <button
                  type="button"
                  onClick={() => setAboutView('main')}
                  className="self-start flex items-center gap-1 text-xs text-slate-400 hover:text-secondary -mt-1"
                >
                  <ArrowRight className="w-3.5 h-3.5" /> رجوع
                </button>

                <div className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-600 bg-gradient-to-b from-blue-50 to-white dark:from-slate-800 dark:to-slate-800">
                  <div className="h-14 bg-gradient-to-l from-blue-600 to-blue-500" />
                  <div className="px-5 pb-5 -mt-9 flex flex-col items-center">
                    <img
                      src={facebookPageImg}
                      alt={FACEBOOK_PAGE_NAME}
                      className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 object-cover shadow-lg"
                    />
                    <h4 className="mt-3 font-bold text-slate-800 dark:text-slate-100">{FACEBOOK_PAGE_NAME}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      <Facebook className="w-3.5 h-3.5 text-blue-600" /> صفحة فيسبوك رسمية
                    </p>
                    <a
                      href={FACEBOOK_PAGE_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      زيارة الصفحة
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
