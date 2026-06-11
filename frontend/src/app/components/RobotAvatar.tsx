import { useEffect, useState } from "react";

type RobotState = "idle" | "talking" | "thinking" | "happy";

interface RobotAvatarProps {
  size?: number;
  state?: RobotState;
  className?: string;
}

export function RobotAvatar({ size = 80, state = "idle" }: RobotAvatarProps) {
  const [blink, setBlink] = useState(false);
  const [lookDir, setLookDir] = useState({ x: 0, y: 0 });
  const [mouthOpen, setMouthOpen] = useState(false);

  // Blink every 3-5 seconds
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Mouth animation when talking
  useEffect(() => {
    if (state !== "talking") { setMouthOpen(false); return; }
    const id = setInterval(() => setMouthOpen(p => !p), 280);
    return () => clearInterval(id);
  }, [state]);

  // Eye roaming when idle/thinking
  useEffect(() => {
    const roam = () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 2.5;
      setLookDir({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    };
    const id = setInterval(roam, 2200);
    return () => clearInterval(id);
  }, []);

  const scale = size / 100;
  const isHappy = state === "happy";

  const eyeScaleY = blink ? 0.08 : 1;
  const pupilX = lookDir.x;
  const pupilY = lookDir.y;

  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 100 115"
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        <linearGradient id="rHeadGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0070CC" />
          <stop offset="100%" stopColor="#003D7A" />
        </linearGradient>
        <linearGradient id="rBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#004A8F" />
          <stop offset="100%" stopColor="#001F3F" />
        </linearGradient>
        <linearGradient id="rEarGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#005299" />
          <stop offset="100%" stopColor="#003060" />
        </linearGradient>
        <linearGradient cx="50%" cy="40%" r="60%" fx="50%" fy="40%"
          gradientUnits="objectBoundingBox" id="eyeGradL">
          <stop offset="0%" stopColor="#00CFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#0055A5" stopOpacity="1" />
        </linearGradient>
        <filter id="rGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="rShadow">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#001F3F" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Antenna base */}
      <rect x="46" y="2" width="8" height="14" rx="4" fill="#0055A5" />

      {/* Antenna orb */}
      <circle cx="50" cy="4" r="6" fill="#F39C12" filter="url(#rGlow)">
        <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="4" r="3" fill="#FFD700" />

      {/* Ear left */}
      <rect x="8" y="28" width="10" height="22" rx="5" fill="url(#rEarGrad)" />
      <rect x="10" y="33" width="4" height="6" rx="2" fill="#00B4FF" opacity="0.7" />

      {/* Ear right */}
      <rect x="82" y="28" width="10" height="22" rx="5" fill="url(#rEarGrad)" />
      <rect x="86" y="33" width="4" height="6" rx="2" fill="#F39C12" opacity="0.7" />

      {/* Head */}
      <rect x="14" y="14" width="72" height="54" rx="16" fill="url(#rHeadGrad)" filter="url(#rShadow)" />

      {/* Head shine */}
      <ellipse cx="40" cy="22" rx="18" ry="7" fill="rgba(255,255,255,0.1)" />

      {/* Eye left — outer */}
      <ellipse
        cx="34" cy="36"
        rx="12" ry={12 * eyeScaleY}
        fill="#001230"
        style={{ transition: "ry 0.08s" }}
      />
      {/* Eye left — iris */}
      <ellipse
        cx={34 + pupilX} cy={36 + pupilY}
        rx="7" ry={7 * eyeScaleY}
        fill="url(#eyeGradL)"
        style={{ transition: "ry 0.08s, cx 0.3s, cy 0.3s" }}
      >
        <animate attributeName="fill" values="#00B4FF;#0055A5;#00B4FF" dur="3s" repeatCount="indefinite" begin="0s" />
      </ellipse>
      {/* Eye left — pupil */}
      <ellipse cx={34 + pupilX} cy={36 + pupilY} rx="3.5" ry={3.5 * eyeScaleY} fill="#00080F" style={{ transition: "ry 0.08s" }} />
      {/* Eye left — glint */}
      <circle cx={36 + pupilX} cy={33 + pupilY} r="2" fill="white" opacity={blink ? 0 : 0.9} />

      {/* Eye right — outer */}
      <ellipse
        cx="66" cy="36"
        rx="12" ry={12 * eyeScaleY}
        fill="#001230"
        style={{ transition: "ry 0.08s" }}
      />
      {/* Eye right — iris */}
      <ellipse
        cx={66 + pupilX} cy={36 + pupilY}
        rx="7" ry={7 * eyeScaleY}
        fill="#00B4FF"
        style={{ transition: "ry 0.08s, cx 0.3s, cy 0.3s" }}
      >
        <animate attributeName="fill" values="#0055A5;#00B4FF;#0055A5" dur="3s" repeatCount="indefinite" begin="1.5s" />
      </ellipse>
      {/* Eye right — pupil */}
      <ellipse cx={66 + pupilX} cy={36 + pupilY} rx="3.5" ry={3.5 * eyeScaleY} fill="#00080F" style={{ transition: "ry 0.08s" }} />
      {/* Eye right — glint */}
      <circle cx={68 + pupilX} cy={33 + pupilY} r="2" fill="white" opacity={blink ? 0 : 0.9} />

      {/* Nose indicator */}
      <circle cx="50" cy="46" r="2.5" fill="rgba(255,255,255,0.2)" />

      {/* Mouth */}
      {isHappy ? (
        <path d="M36,54 Q50,64 64,54" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : mouthOpen ? (
        <ellipse cx="50" cy="56" rx="8" ry="5" fill="#001F3F" stroke="white" strokeWidth="1.5" />
      ) : (
        <path d="M38,56 Q50,62 62,56" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}

      {/* Cheek blush */}
      {isHappy && (
        <>
          <ellipse cx="25" cy="50" rx="7" ry="4" fill="#FF6B9D" opacity="0.3" />
          <ellipse cx="75" cy="50" rx="7" ry="4" fill="#FF6B9D" opacity="0.3" />
        </>
      )}

      {/* Neck */}
      <rect x="42" y="66" width="16" height="8" rx="4" fill="#003060" />

      {/* Body */}
      <rect x="16" y="72" width="68" height="42" rx="12" fill="url(#rBodyGrad)" filter="url(#rShadow)" />

      {/* Chest panel */}
      <rect x="26" y="80" width="48" height="22" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(0,180,255,0.3)" strokeWidth="1" />

      {/* MobiFone logo text on chest */}
      <text x="50" y="91" textAnchor="middle" fill="#60B4FF" fontSize="7" fontWeight="bold" fontFamily="'Outfit',sans-serif">MobiFone</text>
      <text x="50" y="100" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="5" fontFamily="'Outfit',sans-serif">AI ASSISTANT</text>

      {/* Chest indicator LEDs */}
      <circle cx="32" cy="108" r="3" fill="#22C55E">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="108" r="3" fill="#F39C12">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
      </circle>
      <circle cx="68" cy="108" r="3" fill="#00B4FF">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" begin="1s" />
      </circle>

      {/* Body shine */}
      <ellipse cx="35" cy="78" rx="12" ry="4" fill="rgba(255,255,255,0.07)" />
    </svg>
  );
}
