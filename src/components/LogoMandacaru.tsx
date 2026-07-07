import { useState, useEffect, useRef } from 'react';

const FALLBACK_SRC = '/logo-mandacaru.jpg';

interface LogoMandacaruProps {
  size?: number;
  className?: string;
  src?: string | null;
}

export function LogoMandacaru({ size = 40, className = '', src }: LogoMandacaruProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const logoSrc = src || FALLBACK_SRC;

  useEffect(() => {
    if (!modalAberto) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalAberto(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalAberto]);

  useEffect(() => {
    if (!modalAberto) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [modalAberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        className={`flex-shrink-0 cursor-pointer overflow-hidden ${className}`}
        style={{ width: size, height: size }}
        title="Clique para ampliar o logo"
        aria-label="Logo Mandacaru"
      >
        <img
          src={logoSrc}
          alt="Logo Mandacaru"
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            if (logoSrc !== FALLBACK_SRC) {
              (e.target as HTMLImageElement).src = FALLBACK_SRC;
            }
          }}
        />
      </button>

      {modalAberto && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === modalRef.current) setModalAberto(false);
          }}
        >
          <div className="max-w-[420px] w-full">
            <img
              src={logoSrc}
              alt="Logo Mandacaru"
              className="w-full h-auto rounded-2xl shadow-2xl"
              style={{ maxHeight: '80vh', objectFit: 'contain' }}
              onError={(e) => {
                if (logoSrc !== FALLBACK_SRC) {
                  (e.target as HTMLImageElement).src = FALLBACK_SRC;
                }
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
