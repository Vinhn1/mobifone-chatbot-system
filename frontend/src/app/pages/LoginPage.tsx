import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Phone, Eye, EyeOff, ArrowRight, CheckCircle2, ChevronLeft, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MobiFoneLogo } from "../components/MobiFoneLogo";

type Tab = "login" | "register";
type Step = 1 | 2 | 3 | 4;

// Brand Button Style
const BRAND_BTN_STYLE = {
  width: "100%",
  padding: "13px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #E4002B 0%, #FF3B30 100%)", // MobiFone Red Gradient
  color: "white",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  fontFamily: "'Outfit', sans-serif",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 8px 24px rgba(228,0,43,0.3)",
  transition: "all 0.2s ease",
};

function DarkInput({ icon: Icon, placeholder, type = "text", value, onChange }: {
  icon: React.ElementType; placeholder: string; type?: string; value: string; onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPw = type === "password";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      background: "rgba(255,255,255,0.05)",
      border: `1.5px solid ${focused ? "#007FFF" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 12,
      padding: "0 14px",
      height: 50,
      gap: 10,
      transition: "all 0.2s",
      boxShadow: focused ? "0 0 0 3px rgba(0,127,255,0.15)" : "none"
    }}>
      <Icon size={16} style={{ color: focused ? "#007FFF" : "rgba(255,255,255,0.3)", flexShrink: 0, transition: "color 0.2s" }} />
      <input
        type={isPw && !showPw ? "password" : "text"}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          background: "none",
          border: "none",
          outline: "none",
          color: "white",
          fontSize: 14,
          fontFamily: "'Outfit', sans-serif"
        }}
      />
      {isPw && (
        <button type="button" onClick={() => setShowPw(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", padding: 0 }}>
          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  );
}

function StepDots({ step }: { step: Step }) {
  const labels = ["Điện thoại", "OTP", "Mật khẩu", "Hoàn tất"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 24 }}>
      {labels.map((label, i) => {
        const n = i + 1; const done = step > n; const active = step === n;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: done ? "#22C55E" : active ? "linear-gradient(135deg,#E4002B,#FF3B30)" : "rgba(255,255,255,0.06)",
                border: done ? "2px solid #22C55E" : active ? "none" : "1.5px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                transition: "all 0.3s"
              }}>
                {done ? <CheckCircle2 size={14} /> : n}
              </div>
              <span style={{ fontSize: 9, color: active ? "#FF3B30" : "rgba(255,255,255,0.3)", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{label}</span>
            </div>
            {i < labels.length - 1 && <div style={{ width: 32, height: 1.5, background: done ? "#22C55E" : "rgba(255,255,255,0.08)", margin: "0 4px", marginBottom: 18, transition: "background 0.3s" }} />}
          </div>
        );
      })}
    </div>
  );
}

function LoginForm() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!id || !pw) { setError("Vui lòng nhập đầy đủ thông tin"); return; }
    const role = await login(id, pw);
    if (role === "admin") navigate("/admin");
    else if (role === "user") navigate("/dashboard");
    else setError("Thông tin đăng nhập không chính xác");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Demo hint */}
      <div style={{ background: "rgba(0,85,165,0.15)", border: "1px solid rgba(0,85,165,0.3)", borderRadius: 10, padding: "10px 14px" }}>
        <div style={{ color: "#60B4FF", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>💡 Tài khoản demo</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
          <strong style={{ color: "rgba(255,255,255,0.7)" }}>Khách hàng:</strong> 0912345678 / bất kỳ mật khẩu<br />
          <strong style={{ color: "rgba(255,255,255,0.7)" }}>Admin:</strong> admin hoặc admin@mobifone.vn / <span style={{ color: "#FF3B30", fontWeight: 700 }}>admin123</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <DarkInput icon={Phone} placeholder="Số điện thoại hoặc Email" value={id} onChange={setId} />
        <DarkInput icon={Lock} placeholder="Mật khẩu" type="password" value={pw} onChange={setPw} />
      </div>

      {error && <div style={{ color: "#FCA5A5", fontSize: 13, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px" }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <a href="#" style={{ color: "#007FFF", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>Quên mật khẩu?</a>
      </div>

      <button style={BRAND_BTN_STYLE} onClick={handleLogin}>
        Đăng nhập <ArrowRight size={17} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>hoặc</span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
      </div>

      <button style={{
        width: "100%",
        padding: "11px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1.5px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.7)",
        fontWeight: 500,
        fontSize: 14,
        cursor: "pointer",
        fontFamily: "'Outfit',sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8
      }}>
        <span style={{ fontSize: 16 }}>📱</span> Đăng nhập bằng OTP SMS
      </button>
    </div>
  );
}

function OTPBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {Array(6).fill("").map((_, i) => (
        <input key={i} maxLength={1} value={value[i] || ""}
          onChange={e => { const d = value.split(""); d[i] = e.target.value.replace(/\D/, ""); onChange(d.join("").slice(0,6)); }}
          style={{
            width: 44,
            height: 52,
            borderRadius: 12,
            textAlign: "center",
            fontSize: 20,
            fontWeight: 700,
            background: value[i] ? "rgba(0,127,255,0.15)" : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${value[i] ? "#007FFF" : "rgba(255,255,255,0.1)"}`,
            color: "white",
            outline: "none",
            fontFamily: "'Outfit',sans-serif",
            transition: "all 0.2s"
          }}
        />
      ))}
    </div>
  );
}

function RegisterFlow() {
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [regError, setRegError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : password.match(/[A-Z]/) && password.match(/[0-9]/) ? 4 : 3;
  const strengthColors = ["", "#EF4444", "#F59E0B", "#3B82F6", "#22C55E"];
  const strengthLabels = ["", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <StepDots step={step} />
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 4 }}>Nhập số điện thoại để nhận mã OTP xác thực</p>
          <DarkInput icon={Phone} placeholder="Số điện thoại (VD: 0912345678)" value={phone} onChange={setPhone} />
          <button
            style={{ ...BRAND_BTN_STYLE, opacity: phone.length >= 10 ? 1 : 0.5, cursor: phone.length >= 10 ? "pointer" : "not-allowed" }}
            disabled={phone.length < 10}
            onClick={() => setStep(2)}
          >
            Gửi mã OTP <ArrowRight size={17} />
          </button>
        </div>
      )}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Mã OTP đã gửi tới <strong style={{ color: "white" }}>{phone}</strong> — hiệu lực <span style={{ color: "#E4002B", fontWeight: 700 }}>5 phút</span></p>
          <OTPBoxes value={otp} onChange={setOtp} />
          <button
            style={{ ...BRAND_BTN_STYLE, opacity: otp.length === 6 ? 1 : 0.5, cursor: otp.length === 6 ? "pointer" : "not-allowed" }}
            disabled={otp.length !== 6}
            onClick={() => setStep(3)}
          >
            Xác thực OTP <ArrowRight size={17} />
          </button>
          <button onClick={() => setStep(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "'Outfit',sans-serif", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
            <ChevronLeft size={14} /> Thay đổi số điện thoại
          </button>
        </div>
      )}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <DarkInput icon={Lock} placeholder="Mật khẩu mới (ít nhất 8 ký tự)" type="password" value={password} onChange={setPassword} />
          {password.length > 0 && (
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                {[1,2,3,4].map(n => <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= pwStrength ? strengthColors[pwStrength] : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />)}
              </div>
              <span style={{ fontSize: 11, color: strengthColors[pwStrength] }}>Độ mạnh: {strengthLabels[pwStrength]}</span>
            </div>
          )}
          <DarkInput icon={Shield} placeholder="Xác nhận mật khẩu" type="password" value={confirmPw} onChange={setConfirmPw} />
          {regError && <div style={{ color: "#FCA5A5", fontSize: 13, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px" }}>{regError}</div>}
          <button
            style={{ ...BRAND_BTN_STYLE, opacity: password.length >= 6 && password === confirmPw ? 1 : 0.5, cursor: password.length >= 6 && password === confirmPw ? "pointer" : "not-allowed" }}
            disabled={password.length < 6 || password !== confirmPw}
            onClick={async () => {
              setRegError("");
              const result = await register(phone, password);
              if (result === "success") setStep(4);
              else setRegError("Đăng ký thất bại. Số điện thoại có thể đã tồn tại.");
            }}
          >
            Tạo tài khoản <ArrowRight size={17} />
          </button>
        </div>
      )}
      {step === 4 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#22C55E,#16A34A)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(34,197,94,0.4)" }}>
            <CheckCircle2 size={36} color="white" />
          </div>
          <div>
            <h3 style={{ color: "white", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>Tài khoản đã tạo thành công!</h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Chào mừng bạn đến với MobiFone Portal 🎉</p>
          </div>
          <button style={BRAND_BTN_STYLE} onClick={() => navigate("/dashboard")}>
            Đến trang của tôi <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

export function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("tab") === "register") {
      setTab("register");
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "radial-gradient(ellipse at 20% 50%, #0A2A6E 0%, #001330 50%, #000B1E 100%)",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Background orbs */}
      <div style={{ position: "absolute", top: -200, right: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,85,165,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -150, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(228,0,43,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Back button */}
      <button onClick={() => navigate("/")} style={{ position: "fixed", top: 24, left: 24, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, fontFamily: "'Outfit',sans-serif", backdropFilter: "blur(8px)", transition: "all 0.2s" }}>
        <ChevronLeft size={16} /> Trang chủ
      </button>

      <div style={{ display: "flex", gap: 60, alignItems: "center", maxWidth: 860, width: "100%", justifyContent: "center" }}>
        {/* Auth card */}
        <div style={{
          flex: 1,
          maxWidth: 400,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24,
          padding: "32px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)"
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, justifyContent: "center" }}>
            <MobiFoneLogo size={36} />
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 4, marginBottom: 22 }}>
            {(["login", "register"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  transition: "all 0.25s",
                  background: tab === t ? "rgba(228,0,43,0.15)" : "transparent", // MobiFone Red light background
                  color: tab === t ? "#FF3B30" : "rgba(255,255,255,0.4)",
                  boxShadow: tab === t ? "0 2px 8px rgba(228,0,43,0.1)" : "none"
                }}
              >
                {t === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>

          {tab === "login" ? <LoginForm /> : <RegisterFlow />}
        </div>
      </div>
    </div>
  );
}
