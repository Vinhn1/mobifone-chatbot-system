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

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    if (state !== "talking") { setMouthOpen(false); return; }
    const id = setInterval(() => setMouthOpen(p => !p), 280);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    const roam = () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.5;
      setLookDir({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    };
    const id = setInterval(roam, 2500);
    return () => clearInterval(id);
  }, []);

  const isHappy = state === "happy";
  const eyeScaleY = blink ? 0.08 : 1;
  const px = lookDir.x;
  const py = lookDir.y;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        {/* Light blue circular background gradient matching HUTECH sample */}
        <linearGradient id="circleBgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#87D5F8" />
          <stop offset="100%" stopColor="#30B0EB" />
        </linearGradient>

        {/* Headphone and robot head dark blue color */}
        <linearGradient id="headphoneGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#224080" />
          <stop offset="100%" stopColor="#122550" />
        </linearGradient>

        {/* Eye iris gradient — Cyan glow */}
        <radialGradient id="eyeIris" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#A6FFFF" />
          <stop offset="45%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#008EA0" />
        </radialGradient>

        <filter id="glowEffect">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="shadowEffect">
          <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#0A1E3D" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* === MAIN LIGHT BLUE CIRCULAR BODY === */}
      <circle cx="60" cy="60" r="41" fill="url(#circleBgGrad)" filter="url(#shadowEffect)" />

      {/* Circle top inner highlight */}
      <ellipse cx="60" cy="25" rx="28" ry="5" fill="rgba(255,255,255,0.4)" />

      {/* === BRAND TEXT: "mobi fone AI" (styled like HUTECH eLearning AI) === */}
      <g style={{ userSelect: "none" }}>
        {/* "mobi" in dark blue */}
        <text
          x="32"
          y="42"
          fill="#1D397A"
          fontSize="9"
          fontWeight="900"
          fontFamily="'Outfit','Inter',sans-serif"
          letterSpacing="-0.2"
        >
          mobi
        </text>
        {/* "fone" in red */}
        <text
          x="32"
          y="51"
          fill="#E4002B"
          fontSize="9"
          fontWeight="900"
          fontFamily="'Outfit','Inter',sans-serif"
          letterSpacing="-0.2"
        >
          fone
        </text>
        {/* "AI" in dark blue (larger, spanning right side) */}
        <text
          x="73"
          y="49"
          fill="#1D397A"
          fontSize="17"
          fontWeight="900"
          fontFamily="'Outfit','Inter',sans-serif"
        >
          AI
        </text>
      </g>

      {/* === HEADPHONE BAND (wraps around the circle) === */}
      <path
        d="M 23,60 A 37,37 0 0,1 97,60"
        fill="none"
        stroke="url(#headphoneGrad)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      
      {/* Light blue headphone cushion at top */}
      <rect x="52" y="18" width="16" height="5" rx="2.5" fill="#E1F5FE" />

      {/* === ROBOT HEAD SHAPE (inside lower half of the circle) === */}
      <path
        d="M 37,64 C 44,60 76,60 83,64 C 91,71 87,86 60,86 C 33,86 29,71 37,64 Z"
        fill="url(#headphoneGrad)"
        filter="url(#shadowEffect)"
      />

      {/* === EYES === */}
      {/* Left eye socket */}
      <ellipse cx="45" cy="71" rx="10.5" ry={10.5 * eyeScaleY} fill="#09152C" style={{ transition: "ry 0.1s" }} />
      {/* Right eye socket */}
      <ellipse cx="75" cy="71" rx="10.5" ry={10.5 * eyeScaleY} fill="#09152C" style={{ transition: "ry 0.1s" }} />

      {/* Left eye iris */}
      <ellipse
        cx={45 + px}
        cy={71 + py}
        rx="7"
        ry={7 * eyeScaleY}
        fill="url(#eyeIris)"
        filter="url(#glowEffect)"
        style={{ transition: "ry 0.1s, cx 0.25s, cy 0.25s" }}
      />
      <ellipse cx={45 + px} cy={71 + py} rx="3" ry={3 * eyeScaleY} fill="#050E1F" style={{ transition: "ry 0.1s" }} />
      {/* Cute eye sparkles */}
      <circle cx={47 + px} cy={68.5 + py} r="1.8" fill="white" opacity={blink ? 0 : 0.9} />
      <circle cx={43.5 + px} cy={72.5 + py} r="0.8" fill="white" opacity={blink ? 0 : 0.4} />

      {/* Right eye iris */}
      <ellipse
        cx={75 + px}
        cy={71 + py}
        rx="7"
        ry={7 * eyeScaleY}
        fill="url(#eyeIris)"
        filter="url(#glowEffect)"
        style={{ transition: "ry 0.1s, cx 0.25s, cy 0.25s" }}
      />
      <ellipse cx={75 + px} cy={71 + py} rx="3" ry={3 * eyeScaleY} fill="#050E1F" style={{ transition: "ry 0.1s" }} />
      {/* Cute eye sparkles */}
      <circle cx={77 + px} cy={68.5 + py} r="1.8" fill="white" opacity={blink ? 0 : 0.9} />
      <circle cx={73.5 + px} cy={72.5 + py} r="0.8" fill="white" opacity={blink ? 0 : 0.4} />

      {/* === MOUTH === */}
      {isHappy ? (
        <path
          d="M 52,78 Q 60,85 68,78"
          stroke="#00E5FF"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ) : mouthOpen ? (
        <ellipse cx="60" cy="78.5" rx="5" ry="3.5" fill="#09152C" stroke="#00E5FF" strokeWidth="1.2">
          <animate attributeName="ry" values="3.5;1.5;3.5" dur="0.28s" repeatCount="indefinite" />
        </ellipse>
      ) : (
        <path
          d="M 54,78.5 Q 60,82.5 66,78.5"
          stroke="#00E5FF"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* === EAR CUPS === */}
      {/* Left ear cup */}
      <rect x="13" y="49" width="10" height="22" rx="4.5" fill="url(#headphoneGrad)" filter="url(#shadowEffect)" />
      {/* Right ear cup */}
      <rect x="97" y="49" width="10" height="22" rx="4.5" fill="url(#headphoneGrad)" filter="url(#shadowEffect)" />

      {/* === MICROPHONE ARM === */}
      <path
        d="M 18,68 Q 18,97 50,96"
        fill="none"
        stroke="url(#headphoneGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Mic tip */}
      <circle cx="50" cy="96" r="3.5" fill="url(#headphoneGrad)" />
      <circle cx="50" cy="96" r="1.5" fill="#00E5FF" />
    </svg>
  );
}
