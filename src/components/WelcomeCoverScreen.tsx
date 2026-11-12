import React from 'react';

interface WelcomeCoverScreenProps {
  isSigningIn: boolean;
  authError: string | null;
  onSignInWithGoogle: () => void;
  onJustOpenStudyRoom: () => void;
}

export const WelcomeCoverScreen: React.FC<WelcomeCoverScreenProps> = ({
  isSigningIn,
  authError,
  onSignInWithGoogle,
  onJustOpenStudyRoom,
}) => {
  return (
    <div
      className="w-full h-full flex items-center justify-center p-4 sm:p-8 select-none overflow-y-auto"
      style={{
        backgroundColor: 'var(--surface-canvas)',
        backgroundImage:
          'radial-gradient(circle at 50% 38%, rgba(255, 251, 244, 0.7) 0%, rgba(212, 196, 176, 0.4) 100%)',
      }}
    >
      {/* Physical Spiral-Bound Daybook Cover matching the reference image */}
      <div
        className="relative w-full max-w-[430px] min-h-[590px] rounded-2xl px-9 py-11 flex flex-col items-center justify-between text-center border"
        style={{
          backgroundColor: '#F6EFE4',
          borderColor: 'rgba(82, 64, 53, 0.18)',
          boxShadow: 'var(--shadow-lifted), 6px 8px 0 -1px #E6DCCE, 10px 14px 28px rgba(32, 22, 14, 0.22)',
        }}
      >
        {/* Metallic Twin-Loop Spiral Rings along the left spine */}
        <div
          aria-hidden="true"
          className="absolute -left-4 top-8 bottom-8 flex flex-col justify-between py-2 pointer-events-none"
        >
          {Array.from({ length: 13 }).map((_, idx) => (
            <div key={idx} className="flex items-center">
              <div
                className="w-7 h-3 rounded-full"
                style={{
                  background:
                    'linear-gradient(180deg, #DFC9A6 0%, #9E8156 52%, #5E4A2E 100%)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                }}
              />
              <div className="w-2.5 h-2.5 rounded-full bg-stone-800/75 -ml-1.5" />
            </div>
          ))}
        </div>

        {/* Top Delicate Sparkle & Brand Header */}
        <div className="w-full pt-2">
          <div className="flex justify-end pr-6 text-amber-800/60 text-lg">✧</div>
          <h1
            className="text-6xl font-semibold tracking-tight text-[#3A2E27] mt-1"
            style={{ fontFamily: 'var(--font-hand-caveat)' }}
          >
            NOTE BOOK
          </h1>
          {/* Hand-drawn underline */}
          <svg className="w-44 h-4 mx-auto -mt-1 text-[#3A2E27]" viewBox="0 0 180 14">
            <path
              d="M 12 10 Q 92 2 168 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>

          <p
            className="mt-3 text-2xl text-[#4B3D34] leading-snug"
            style={{ fontFamily: 'var(--font-hand-caveat)' }}
          >
            Your personal journal,
            <br />
            anytime, anywhere ♡
          </p>
        </div>

        {/* Center Botanical Potted Plant Line Art Illustration */}
        <div className="my-4 flex flex-col items-center">
          <svg
            className="w-28 h-32 text-[#3A2E27]"
            viewBox="0 0 120 140"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* Central and side botanical leaves */}
            <path d="M60 82 C60 55 60 28 60 18" />
            <path d="M60 18 C46 32 46 56 60 72 C74 56 74 32 60 18 Z" fill="rgba(108, 132, 105, 0.16)" />
            <path d="M60 78 C42 64 24 46 20 34" />
            <path d="M20 34 C18 52 32 68 54 74 C48 52 36 38 20 34 Z" fill="rgba(108, 132, 105, 0.14)" />
            <path d="M60 78 C78 64 96 46 100 34" />
            <path d="M100 34 C102 52 88 68 66 74 C72 52 84 38 100 34 Z" fill="rgba(108, 132, 105, 0.14)" />
            <path d="M60 82 C38 78 24 72 16 66" />
            <path d="M60 82 C82 78 96 72 104 66" />
            {/* Terracotta Pot */}
            <rect x="34" y="84" width="52" height="9" rx="2" fill="#EBDCCB" />
            <path d="M38 93 L44 126 L76 126 L82 93 Z" fill="rgba(184, 132, 96, 0.18)" />
          </svg>
        </div>

        {/* Bottom Authentication & Direct Entry Actions */}
        <div className="w-full max-w-[280px] space-y-3 pb-2">
          <button
            type="button"
            onClick={onSignInWithGoogle}
            disabled={isSigningIn}
            className="w-full py-3 px-5 rounded-xl bg-[#FDFBF7] hover:bg-white border border-stone-300/90 text-[#2C241E] text-sm font-semibold flex items-center justify-center gap-3 shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{isSigningIn ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          {authError && (
            <p className="text-xs text-red-800 bg-red-50/90 border border-red-200 rounded-lg px-2.5 py-1.5">
              {authError}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="h-px flex-1 bg-stone-300/80" />
            <span>or</span>
            <span className="h-px flex-1 bg-stone-300/80" />
          </div>

          <button
            type="button"
            onClick={onJustOpenStudyRoom}
            className="text-sm font-medium text-[#4A3B31] hover:text-stone-950 underline underline-offset-4 cursor-pointer py-1"
          >
            Just open...
          </button>
        </div>
      </div>
    </div>
  );
};
