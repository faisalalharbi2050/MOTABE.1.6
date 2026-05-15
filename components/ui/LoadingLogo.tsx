import React, { useEffect, useRef, useState } from 'react';

/**
 * يحافظ على قيمة "true" لمدة لا تقل عن minMs بعد ظهورها أول مرة،
 * حتى لو رجعت الحالة الأصلية إلى false بسرعة. مفيد لإبقاء شعار
 * التحميل ظاهرًا فترة كافية ليراها المستخدم.
 */
export function useMinLoadingTime(active: boolean, minMs: number = 1500): boolean {
  const [sticky, setSticky] = useState(active);
  const startedAt = useRef<number | null>(active ? Date.now() : null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      if (startedAt.current === null) startedAt.current = Date.now();
      if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
      setSticky(true);
      return;
    }
    if (startedAt.current === null) { setSticky(false); return; }
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, minMs - elapsed);
    if (remaining === 0) {
      startedAt.current = null;
      setSticky(false);
    } else {
      timer.current = window.setTimeout(() => {
        startedAt.current = null;
        timer.current = null;
        setSticky(false);
      }, remaining);
    }
    return () => {
      if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    };
  }, [active, minMs]);

  return sticky;
}


interface LoadingLogoProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { logo: 36, dot: 7,  gap: 6,  stack: 10 },
  md: { logo: 64, dot: 11, gap: 9,  stack: 14 },
  lg: { logo: 88, dot: 13, gap: 10, stack: 18 },
};

const LoadingLogo: React.FC<LoadingLogoProps> = ({
  size = 'md',
  message,
  fullScreen = false,
  className = '',
}) => {
  const s = SIZE_MAP[size];

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`} style={{ gap: s.stack }}>
      <div style={{ width: s.logo, height: s.logo, animation: 'motabeLogoFade 4.5s ease-in-out infinite' }}>
        <img src="/logo.png" alt="متابع" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div className="flex" style={{ gap: s.gap }}>
        <span style={{ width: s.dot, height: s.dot, background: '#655ac1', borderRadius: '50%', animation: 'motabeDotBounce 1.4s ease-in-out infinite' }} />
        <span style={{ width: s.dot, height: s.dot, background: '#8779fb', borderRadius: '50%', animation: 'motabeDotBounce 1.4s ease-in-out .2s infinite' }} />
        <span style={{ width: s.dot, height: s.dot, background: '#a89dff', borderRadius: '50%', animation: 'motabeDotBounce 1.4s ease-in-out .4s infinite' }} />
      </div>
      {message && (
        <p className="text-sm font-bold text-[#655ac1] text-center" style={{ marginTop: 4 }}>{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[200] bg-white/85 backdrop-blur-sm flex items-center justify-center">
        <LoadingLogoStyles />
        {content}
      </div>
    );
  }

  return (
    <>
      <LoadingLogoStyles />
      {content}
    </>
  );
};

// Inject keyframes once. React will dedupe identical <style> tags in the DOM
// without issue; even multiple copies are harmless since they declare the same
// animations.
const LoadingLogoStyles: React.FC = () => (
  <style>{`
    @keyframes motabeLogoFade {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes motabeDotBounce {
      0%, 100% { transform: translateY(0); opacity: .45; }
      50% { transform: translateY(-12px); opacity: 1; }
    }
  `}</style>
);

export default LoadingLogo;
