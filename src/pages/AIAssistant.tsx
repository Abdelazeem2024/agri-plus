import { useState, useRef, useEffect } from 'react';
import { Sparkles, Mic, Send, Square, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { understandAndExecute, type AIResult } from '../lib/aiEngine';

const SUGGESTIONS = [
  'كام صافي الربح الشهر ده؟',
  'مين العملاء اللي عليهم فلوس؟',
  'في أصناف قربت تخلص من المخزون؟',
  'كام إجمالي المبيعات اليوم؟'
];

interface HistoryItem {
  query: string;
  result: AIResult;
}

export default function AIAssistant() {
  const { data } = useApp();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // التحقق مما إذا كان تحويل الصوت لنص متاحاً (يحتاج نموذج whisper.cpp منزَّلاً
    // محلياً — راجع ملاحظة "الصوت" أسفل الصفحة). إن لم يكن متاحاً، يبقى الكتابة
    // النصية متاحة دائماً بكامل قدرة الفهم نفسها.
    const api = (window as any).electronAPI;
    if (api?.aiVoiceAvailable) {
      api.aiVoiceAvailable().then((v: boolean) => setVoiceAvailable(v));
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const runQuery = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const result = understandAndExecute(q, data);
    setHistory(h => [...h, { query: q, result }]);
    setQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runQuery(query);
  };

  const handleMicClick = async () => {
    const api = (window as any).electronAPI;
    if (!api?.aiTranscribeStart || !voiceAvailable) {
      return; // الزر معطَّل أصلاً في هذه الحالة (انظر الواجهة أدناه)
    }
    if (!recording) {
      setRecording(true);
      await api.aiTranscribeStart();
    } else {
      setRecording(false);
      setTranscribing(true);
      try {
        const text: string = await api.aiTranscribeStop();
        if (text) runQuery(text);
      } finally {
        setTranscribing(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-full">
      <div className="text-center space-y-2 pt-2 pb-6">
        <h1 className="flex items-center justify-center gap-3 text-3xl font-extrabold text-slate-800 dark:text-white">
          <span className="inline-flex w-11 h-11 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-emerald-700 shadow-lg shadow-emerald-600/30">
            <Sparkles className="w-6 h-6 text-white" />
          </span>
          <span>مساعد Agri Plus الذكي</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">اسأل عن أي شيء في بياناتك — أرباح، مديونيات، مخزون، مبيعات...</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4 px-1">
        {history.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => runQuery(s)}
                className="text-right px-4 py-3 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 hover:border-secondary text-sm text-slate-600 dark:text-slate-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {history.map((h, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-end">
              <div className="bg-secondary text-white px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-[80%] text-sm">
                {h.query}
              </div>
            </div>
            <ResultCard result={h.result} />
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={recording ? 'جارٍ الاستماع...' : 'اكتب سؤالك هنا...'}
          disabled={recording || transcribing}
          autoComplete="off"
          className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary text-sm disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleMicClick}
          disabled={!voiceAvailable || transcribing}
          title={voiceAvailable ? 'تسجيل صوتي' : 'الإدخال الصوتي غير مُفعَّل على هذا الجهاز'}
          className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center transition-colors ${
            recording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {transcribing ? <Loader2 className="w-5 h-5 animate-spin" /> : recording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button
          type="submit"
          disabled={!query.trim() || recording || transcribing}
          className="w-11 h-11 shrink-0 rounded-2xl bg-secondary text-white flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {!voiceAvailable && (
        <p className="text-[11px] text-slate-400 text-center mt-2">
          الإدخال الصوتي يحتاج تفعيلاً لمرة واحدة من الإعدادات — الكتابة تعمل بكامل قدرة الفهم الآن.
        </p>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: AIResult }) {
  if (!result.understood) {
    return (
      <div className="flex justify-start">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] flex items-start gap-2.5">
          <AlertCircle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{result.title}</p>
            {result.needsClarification && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{result.needsClarification}</p>}
          </div>
        </div>
      </div>
    );
  }

  const toneClass = (tone?: string) =>
    tone === 'good' ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'bad' ? 'text-red-500 dark:text-red-400'
    : 'text-slate-800 dark:text-slate-100';

  return (
    <div className="flex justify-start">
      <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tr-sm px-5 py-4 max-w-[92%] w-full shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-secondary to-emerald-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </span>
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">{result.title}</h3>
        </div>

        {result.summary && <p className="text-sm text-slate-600 dark:text-slate-300">{result.summary}</p>}

        {result.stats && result.stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {result.stats.map((s, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">{s.label}</p>
                <p className={`text-sm font-extrabold ${toneClass(s.tone)}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {result.table && result.table.rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {result.table.headers.map((h, i) => (
                    <th key={i} className="text-right p-2 font-bold text-slate-600 dark:text-slate-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.table.rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-slate-100 dark:border-slate-700">
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-2 text-slate-700 dark:text-slate-200">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
