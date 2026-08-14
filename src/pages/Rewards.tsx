import { useEffect, useMemo, useState } from 'react';
import { Gift, Copy, Check, MessageCircle, Users, UserPlus, Trophy, Sparkles } from 'lucide-react';
import { useApp } from '../store/AppContext';

const CONTACT_PHONE = '01037235921';

/**
 * يولّد كوداً فريداً وثابتاً لهذا الجهاز/الترخيص بصيغة AGP-XXXX-YY، مبنياً على
 * بصمة الجهاز نفسها — بدون أي خادم، ونفس الكود يظهر دائماً لنفس التثبيت.
 */
function generateInviteCode(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const num = 1000 + (hash % 9000);
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // بدون I/O لتفادي الالتباس مع 1/0
  const l1 = letters[hash % letters.length];
  const l2 = letters[Math.floor(hash / letters.length) % letters.length];
  return `AGP-${num}-${l1}${l2}`;
}

const TIERS = [
  { count: '1', title: 'دعوة صديق واحد بنجاح', reward: '3 شهور تفعيل مجانًا', icon: UserPlus, tone: 'from-emerald-500 to-teal-600' },
  { count: '2', title: 'دعوة صديقين بنجاح', reward: '6 شهور تفعيل مجانًا', icon: Users, tone: 'from-teal-500 to-emerald-700' },
  { count: '3', title: 'دعوة 3 أصدقاء بنجاح', reward: 'سنة كاملة تفعيل مجانًا!', icon: Trophy, tone: 'from-amber-500 to-yellow-600' }
];

export default function Rewards() {
  const { licenseValid, data } = useApp();
  const [machineId, setMachineId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.getMachineId) api.getMachineId().then(setMachineId);
  }, []);

  const inviteCode = useMemo(() => {
    const seed = machineId || data.license?.machineId || '';
    return seed ? generateInviteCode(seed) : '';
  }, [machineId, data.license?.machineId]);

  const handleCopy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
    } catch {
      const el = document.createElement('textarea');
      el.value = inviteCode;
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
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* الرأس */}
      <div className="text-center space-y-2 pt-2">
        <h1 className="flex items-center justify-center gap-3 text-4xl font-extrabold text-slate-800 dark:text-white">
          <span>مكافآتي</span>
          <span className="inline-flex w-11 h-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/30">
            <Gift className="w-6 h-6 text-white" />
          </span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          ادعُ أصدقاءك، واربح اشتراكًا مجانيًا!
        </p>
      </div>

      {/* بطاقات المكافآت الثلاث */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map((t) => (
          <div
            key={t.count}
            className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 shadow-lg dark:shadow-black/30 p-6 flex flex-col items-center text-center gap-4 transition-transform hover:-translate-y-1"
          >
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l ${t.tone}`} />
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.tone} flex items-center justify-center shadow-md`}>
              <t.icon className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-300">{t.title}</p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-l ${t.tone} shadow-md`}>
                <span className="text-base">🎁</span>
                <p className="text-base font-extrabold text-white whitespace-nowrap">{t.reward}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* كود الدعوة */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-950 dark:from-black dark:to-emerald-950 p-8 shadow-2xl shadow-emerald-950/30 relative overflow-hidden">
        <Sparkles className="absolute -left-4 -top-4 w-28 h-28 text-emerald-400/10" />
        <div className="relative space-y-4 text-center">
          <p className="text-sm font-bold text-emerald-300/80 tracking-wide">كود الدعوة الخاص بك</p>

          {!licenseValid ? (
            <div className="py-6">
              <p className="text-white/70 text-sm">
                يظهر كود الدعوة الخاص بك تلقائياً بعد تفعيل البرنامج.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="px-6 py-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
                  <span className="text-2xl md:text-3xl font-mono font-extrabold tracking-widest text-amber-300">
                    {inviteCode || '—'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!inviteCode}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-900'
                  }`}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'تم النسخ' : 'نسخ'}
                </button>
              </div>

              <p className="text-white/50 text-xs max-w-md mx-auto leading-relaxed pt-1">
                يتم إنشاء كود الدعوة تلقائياً بعد تفعيل البرنامج، وهو فريد لحساب عميلك ولا يُستخدم لأي عميل آخر — ولا تُحتسب الدعوات غير الحقيقية أو المكررة.
              </p>
            </>
          )}
        </div>
      </div>

      {/* شرح النظام */}
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
        كل دعوة ناجحة تقربك من مكافأة أكبر. شارك كودك الآن وابدأ في جمع التفعيل المجاني.
      </p>

      {/* التواصل */}
      <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-5 text-center space-y-2 shadow-md">
        <p className="text-sm font-bold text-slate-900">
          عند دعوة صديق، اطلب منه ذكر هذا الكود عند التواصل معنا — وسنضيف مكافأتك تلقائياً عند تفعيله.
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="font-mono font-bold text-lg text-slate-900" dir="ltr">{CONTACT_PHONE}</span>
          <span className="flex items-center gap-1 text-emerald-700 text-sm font-semibold">
            <MessageCircle className="w-4 h-4" /> واتساب
          </span>
        </div>
      </div>

      {/* ملاحظة أسفل الصفحة */}
      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 max-w-lg mx-auto leading-relaxed">
        تُحتسب الدعوة بعد تسجيل العميل الجديد وتفعيل البرنامج، ولا تُحتسب الدعوات الوهمية أو المكررة.
      </p>
    </div>
  );
}
