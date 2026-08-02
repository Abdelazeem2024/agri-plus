import { useEffect, useState } from 'react';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 300);
    }, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary transition-opacity duration-300">
      <div className="splash-anim flex flex-col items-center">
        <img
          src="/logo.png"
          alt="Agri Plus"
          className="w-48 h-48 object-contain mb-6 drop-shadow-2xl"
        />
        <h1 className="text-4xl font-bold text-white mb-2">Agri Plus</h1>
        <p className="text-lg text-emerald-300 font-medium">إدارة ذكية... ونمو مستمر</p>
        <div className="mt-8 w-48 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-secondary rounded-full animate-pulse" style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  );
}
