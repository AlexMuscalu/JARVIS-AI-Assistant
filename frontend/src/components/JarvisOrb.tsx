import { useEffect, useRef } from 'react';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface JarvisOrbProps {
  state: OrbState;
  analyserNode?: AnalyserNode | null;
}

const STATE_LABELS: Record<OrbState, string> = {
  idle: '// IDLE //',
  listening: '// LISTENING //',
  thinking: '// PROCESSING //',
  speaking: '// SPEAKING //',
  error: '// ERROR //',
};

const STATE_COLORS: Record<OrbState, string> = {
  idle: '#00D4FF',
  listening: '#FFB800',
  thinking: '#00D4FF',
  speaking: '#00D4FF',
  error: '#FF6B35',
};

export function JarvisOrb({ state, analyserNode }: JarvisOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const fakePhaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SIZE = canvas.width;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const RING_R = SIZE * 0.46;
    const color = STATE_COLORS[state];

    function drawFrame() {
      ctx!.clearRect(0, 0, SIZE, SIZE);

      if (state === 'listening' || state === 'speaking') {
        const dataArray = analyserNode
          ? (() => {
              const arr = new Uint8Array(analyserNode.frequencyBinCount);
              analyserNode.getByteFrequencyData(arr);
              return arr;
            })()
          : null;

        const binCount = dataArray ? dataArray.length : 64;
        ctx!.beginPath();
        for (let i = 0; i < binCount; i++) {
          const angle = (i / binCount) * Math.PI * 2 - Math.PI / 2;
          let amplitude: number;
          if (dataArray) {
            amplitude = (dataArray[i] / 255) * RING_R * 0.35;
          } else {
            // fake sine amplitude for BrowserSpeechSynthesis
            fakePhaseRef.current += 0.04;
            amplitude = Math.abs(Math.sin(fakePhaseRef.current + i * 0.3)) * RING_R * 0.2;
          }
          const innerR = RING_R;
          const outerR = RING_R + amplitude;
          const x1 = cx + Math.cos(angle) * innerR;
          const y1 = cy + Math.sin(angle) * innerR;
          const x2 = cx + Math.cos(angle) * outerR;
          const y2 = cy + Math.sin(angle) * outerR;
          ctx!.moveTo(x1, y1);
          ctx!.lineTo(x2, y2);
        }
        ctx!.strokeStyle = color;
        ctx!.lineWidth = 1.5;
        ctx!.globalAlpha = 0.8;
        ctx!.stroke();
      } else if (state === 'thinking') {
        // Rotating dashed arc
        const now = performance.now() / 1000;
        const dashOffset = now * 120;
        ctx!.beginPath();
        ctx!.arc(cx, cy, RING_R, 0, Math.PI * 2);
        ctx!.strokeStyle = color;
        ctx!.lineWidth = 2;
        ctx!.setLineDash([12, 8]);
        ctx!.lineDashOffset = -dashOffset;
        ctx!.globalAlpha = 0.7;
        ctx!.stroke();
        ctx!.setLineDash([]);
      } else {
        // idle / error — static ring
        ctx!.beginPath();
        ctx!.arc(cx, cy, RING_R, 0, Math.PI * 2);
        ctx!.strokeStyle = color;
        ctx!.lineWidth = 1;
        ctx!.globalAlpha = state === 'error' ? 0.6 : 0.3;
        ctx!.stroke();
      }

      ctx!.globalAlpha = 1;

      if (state === 'thinking' || state === 'listening' || state === 'speaking') {
        rafRef.current = requestAnimationFrame(drawFrame);
      }
    }

    if (state === 'idle' || state === 'error') {
      drawFrame();
    } else {
      rafRef.current = requestAnimationFrame(drawFrame);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [state, analyserNode]);

  const ringColor = STATE_COLORS[state];
  const isThinking = state === 'thinking';
  const isError = state === 'error';

  return (
    <div className="orb-wrapper" style={{ position: 'relative', width: 260, height: 260 }}>
      {/* SVG base layer */}
      <svg
        width="260"
        height="260"
        viewBox="0 0 260 260"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer rotating rings */}
        <circle
          cx="130" cy="130" r="120"
          fill="none"
          stroke={ringColor}
          strokeWidth="0.5"
          opacity={isError ? 0.6 : 0.3}
          style={isThinking ? { animation: 'spin 11s linear infinite' } : undefined}
        />
        <circle
          cx="130" cy="130" r="95"
          fill="none"
          stroke={ringColor}
          strokeWidth="0.5"
          opacity={isError ? 0.7 : 0.4}
          style={isThinking ? { animation: 'spin-reverse 7s linear infinite' } : undefined}
        />
        <circle
          cx="130" cy="130" r="70"
          fill="none"
          stroke={ringColor}
          strokeWidth="1"
          opacity={isError ? 0.8 : 0.5}
          style={isThinking ? { animation: 'spin 4s linear infinite' } : undefined}
        />

        {/* Tick marks on r=95 ring */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const r = 95;
          const x1 = 130 + Math.cos(rad) * (r - 4);
          const y1 = 130 + Math.sin(rad) * (r - 4);
          const x2 = 130 + Math.cos(rad) * (r + 4);
          const y2 = 130 + Math.sin(rad) * (r + 4);
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ringColor} strokeWidth="1.5" opacity="0.6" />;
        })}

        {/* Central circle */}
        <circle
          cx="130" cy="130" r="20"
          fill={ringColor}
          opacity={isError ? 0.9 : 0.7}
          filter="url(#glow)"
          style={{
            animation: state === 'idle'
              ? 'pulse-slow 3s ease-in-out infinite'
              : state === 'listening'
              ? 'pulse-fast 0.5s ease-in-out infinite'
              : isError
              ? 'pulse-fast 0.4s ease-in-out infinite'
              : undefined,
            transformOrigin: '130px 130px',
          }}
        />

        {/* Inner ring */}
        <circle
          cx="130" cy="130" r="32"
          fill="none"
          stroke={ringColor}
          strokeWidth="1"
          opacity="0.5"
        />
      </svg>

      {/* Canvas reactive ring overlay */}
      <canvas
        ref={canvasRef}
        width={260}
        height={260}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />

      {/* State label below orb */}
      <div
        style={{
          position: 'absolute',
          bottom: -28,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 10,
          letterSpacing: '0.15em',
          color: ringColor,
          textShadow: `0 0 8px ${ringColor}`,
          animation: isThinking ? 'blink 1s step-end infinite' : undefined,
        }}
      >
        {STATE_LABELS[state]}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(0.97); opacity: 0.7; }
          50% { transform: scale(1.03); opacity: 1; }
        }
        @keyframes pulse-fast {
          0%, 100% { transform: scale(0.92); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
