import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Lock, Eye, EyeOff, ArrowRight, ChevronLeft, Mail, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MobiFoneLogo } from "../components/MobiFoneLogo";

function BrandInput({ icon: Icon, placeholder, type = "text", value, onChange }: {
  icon: React.ElementType; placeholder: string; type?: string; value: string; onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPw = type === "password";

  return (
    <div className={`flex items-center bg-slate-50 border ${
      focused ? "border-blue-500 shadow-xs ring-4 ring-blue-500/10" : "border-slate-200"
    } rounded-xl px-4 h-12 gap-2.5 transition-all duration-200`}>
      <Icon size={16} className={`shrink-0 transition-colors duration-200 ${focused ? "text-blue-600" : "text-slate-400"}`} />
      <input
        type={isPw && !showPw ? "password" : "text"}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).closest("form")?.querySelector("button[type=submit]")?.dispatchEvent(new MouseEvent("click"))}
        className="flex-1 bg-transparent border-none outline-none text-slate-800 text-sm font-semibold placeholder-slate-400"
      />
      {isPw && (
        <button
          type="button"
          onClick={() => setShowPw(p => !p)}
          className="background-none border-none cursor-pointer text-slate-400 hover:text-slate-600 flex p-0"
        >
          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  );
}

function OTPBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2.5 justify-center">
      {Array(6).fill("").map((_, i) => (
        <input
          key={i}
          maxLength={1}
          value={value[i] || ""}
          onChange={e => {
            const d = value.split("");
            d[i] = e.target.value.replace(/\D/, "");
            onChange(d.join("").slice(0, 6));
          }}
          className={`w-11 h-13 rounded-xl text-center text-lg font-bold outline-none transition-all duration-200 ${
            value[i]
              ? "bg-blue-50 border border-blue-400 text-blue-700"
              : "bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-300 focus:bg-white"
          }`}
        />
      ))}
    </div>
  );
}

function LoginForm() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [is2faRequired, setIs2faRequired] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { login, verify2faLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!id || !pw) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setError("");
    setIsLoading(true);
    const role = await login(id, pw);
    setIsLoading(false);
    if (role === "admin" || role === "sales") {
      navigate("/admin");
    } else if (role === "require_2fa") {
      setLoginId(id);
      setIs2faRequired(true);
    } else {
      setError("Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại.");
    }
  };

  const handleVerify2fa = async () => {
    if (otp.length !== 6) {
      setError("Vui lòng nhập đầy đủ mã OTP 6 chữ số");
      return;
    }
    setIsVerifying(true);
    setError("");
    const role = await verify2faLogin(loginId, otp);
    if (role === "admin" || role === "sales") {
      navigate("/admin");
    } else {
      setError("Mã OTP không chính xác hoặc đã hết hạn");
      setIsVerifying(false);
    }
  };

  if (is2faRequired) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
            <Shield size={22} className="text-blue-600" />
          </div>
          <p className="text-slate-700 text-sm font-bold mb-1">Xác thực 2 lớp (2FA)</p>
          <p className="text-slate-400 text-xs font-semibold">
            Mã OTP đã được gửi đến email đăng ký của bạn.
          </p>
        </div>

        <OTPBoxes value={otp} onChange={setOtp} />

        {error && (
          <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg p-2.5 font-semibold">
            {error}
          </div>
        )}

        <button
          onClick={handleVerify2fa}
          disabled={otp.length !== 6 || isVerifying}
          className={`w-full py-3 rounded-xl bg-gradient-to-r from-[#0055A5] to-[#0044CC] text-white font-bold text-sm shadow-md transition-all duration-200 border-none flex items-center justify-center gap-2 ${
            otp.length === 6 && !isVerifying
              ? "cursor-pointer opacity-100 hover:shadow-lg hover:shadow-blue-500/25 active:scale-98"
              : "cursor-not-allowed opacity-50"
          }`}
        >
          {isVerifying ? "Đang xác thực..." : "Xác thực OTP"} <ArrowRight size={17} />
        </button>

        <button
          onClick={() => { setIs2faRequired(false); setOtp(""); setError(""); }}
          className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 text-xs font-bold flex items-center gap-1 justify-center mt-2"
        >
          <ChevronLeft size={14} /> Quay lại đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <BrandInput icon={Mail} placeholder="Tài khoản (email hoặc username)" value={id} onChange={setId} />
        <BrandInput icon={Lock} placeholder="Mật khẩu" type="password" value={pw} onChange={setPw} />
      </div>

      {error && (
        <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg p-2.5 font-semibold">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 text-xs no-underline font-bold transition-colors">
          Quên mật khẩu?
        </Link>
      </div>

      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0055A5] to-[#0044CC] hover:from-[#0044CC] hover:to-[#0033AA] text-white font-bold text-sm cursor-pointer shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-102 active:scale-98 transition-all duration-200 border-none flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
      >
        {isLoading ? "Đang xác thực..." : "Đăng nhập hệ thống"} {!isLoading && <ArrowRight size={17} />}
      </button>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#080d1a] relative overflow-hidden font-outfit">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,85,165,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,85,165,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Radial glow orbs */}
      <div className="absolute -top-[200px] -right-[100px] w-[600px] h-[600px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(0,85,165,0.15)_0%,transparent_70%)] blur-3xl" />
      <div className="absolute -bottom-[150px] -left-[100px] w-[500px] h-[500px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(227,6,19,0.10)_0%,transparent_70%)] blur-3xl" />

      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="fixed top-6 left-6 bg-white/10 border border-white/20 hover:bg-white/15 backdrop-blur rounded-xl px-4 py-2 text-white/70 hover:text-white cursor-pointer flex items-center gap-1.5 text-xs font-semibold transition-all duration-200"
      >
        <ChevronLeft size={16} /> Trang chủ
      </button>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Auth card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8 gap-3">
            <MobiFoneLogo size={44} dark={false} />
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399] animate-pulse inline-block" />
                Hệ thống Quản trị Nội bộ
              </div>
              <p className="text-white/40 text-xs font-medium">Chỉ dành cho Admin & Nhân viên CSKH</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mb-6" />

          {/* Login form with adapted dark styling */}
          <style>{`
            .login-dark input {
              background: rgba(255,255,255,0.05) !important;
              border-color: rgba(255,255,255,0.12) !important;
              color: white !important;
            }
            .login-dark input::placeholder { color: rgba(255,255,255,0.3) !important; }
            .login-dark input:focus { border-color: rgba(0,85,165,0.6) !important; background: rgba(0,85,165,0.08) !important; }
            .login-dark .brand-input-wrap { background: rgba(255,255,255,0.04) !important; border-color: rgba(255,255,255,0.12) !important; }
            .login-dark .brand-input-wrap.focused { border-color: #0055A5 !important; box-shadow: 0 0 0 4px rgba(0,85,165,0.15) !important; background: rgba(0,85,165,0.08) !important; }
          `}</style>

          <div className="login-dark">
            <DarkLoginForm navigate={navigate} />
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs font-medium mt-6">
          © 2025 MobiFone · Nền tảng AI Chatbot Doanh nghiệp
        </p>
      </div>
    </div>
  );
}

// Dark-themed login form embedded directly to avoid CSS class conflicts
function DarkLoginForm({ navigate }: { navigate: (path: string) => void }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [is2faRequired, setIs2faRequired] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { login, verify2faLogin } = useAuth();

  const inputClass = "w-full bg-white/5 border border-white/12 focus:border-blue-500/60 focus:bg-blue-500/8 outline-none rounded-xl px-4 h-12 text-sm font-semibold text-white placeholder-white/30 transition-all duration-200";

  const handleLogin = async () => {
    if (!id || !pw) { setError("Vui lòng nhập đầy đủ thông tin"); return; }
    setError(""); setIsLoading(true);
    const role = await login(id, pw);
    setIsLoading(false);
    if (role === "admin" || role === "sales") {
      navigate("/admin");
    } else if (role === "require_2fa") {
      setLoginId(id); setIs2faRequired(true);
    } else {
      setError("Thông tin đăng nhập không chính xác.");
    }
  };

  const handleVerify2fa = async () => {
    if (otp.length !== 6) { setError("Vui lòng nhập đủ 6 chữ số OTP"); return; }
    setIsVerifying(true); setError("");
    const role = await verify2faLogin(loginId, otp);
    if (role === "admin" || role === "sales") navigate("/admin");
    else { setError("Mã OTP không chính xác hoặc đã hết hạn"); setIsVerifying(false); }
  };

  if (is2faRequired) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center mb-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center mx-auto mb-3">
            <Shield size={22} className="text-blue-400" />
          </div>
          <p className="text-white/80 text-sm font-bold mb-1">Xác thực 2 lớp (2FA)</p>
          <p className="text-white/40 text-xs">Mã OTP đã được gửi đến email đăng ký của bạn.</p>
        </div>
        <div className="flex gap-2.5 justify-center">
          {Array(6).fill("").map((_, i) => (
            <input key={i} maxLength={1} value={otp[i] || ""}
              onChange={e => { const d = otp.split(""); d[i] = e.target.value.replace(/\D/, ""); setOtp(d.join("").slice(0,6)); }}
              className={`w-11 h-13 rounded-xl text-center text-lg font-bold outline-none transition-all duration-200 ${otp[i] ? "bg-blue-500/20 border border-blue-400/60 text-blue-300" : "bg-white/5 border border-white/12 text-white focus:border-blue-400/60"}`}
            />
          ))}
        </div>
        {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 font-semibold">{error}</div>}
        <button onClick={handleVerify2fa} disabled={otp.length !== 6 || isVerifying}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0055A5] to-[#0044CC] text-white font-bold text-sm border-none flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 active:scale-98 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-900/40">
          {isVerifying ? "Đang xác thực..." : "Xác thực OTP"} {!isVerifying && <ArrowRight size={17} />}
        </button>
        <button onClick={() => { setIs2faRequired(false); setOtp(""); setError(""); }}
          className="bg-transparent border-none cursor-pointer text-white/40 hover:text-white/70 text-xs font-bold flex items-center gap-1 justify-center">
          <ChevronLeft size={14} /> Quay lại đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {/* Email input */}
        <div className="relative">
          <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input type="text" placeholder="Email hoặc tên đăng nhập" value={id} onChange={e => setId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className={`${inputClass} pl-10`} />
        </div>
        {/* Password input */}
        <div className="relative">
          <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input type={showPw ? "text" : "password"} placeholder="Mật khẩu" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className={`${inputClass} pl-10 pr-11`} />
          <button type="button" onClick={() => setShowPw(p => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-white/30 hover:text-white/60 transition-colors p-0">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 font-semibold">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 text-xs no-underline font-bold transition-colors">
          Quên mật khẩu?
        </Link>
      </div>

      <button onClick={handleLogin} disabled={isLoading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0055A5] to-[#0044CC] hover:from-[#0044CC] hover:to-[#0033AA] text-white font-bold text-sm cursor-pointer shadow-lg shadow-blue-900/40 hover:shadow-xl hover:shadow-blue-900/50 hover:scale-[1.02] active:scale-98 transition-all duration-200 border-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
        {isLoading ? "Đang xác thực..." : "Đăng nhập hệ thống"} {!isLoading && <ArrowRight size={17} />}
      </button>
    </div>
  );
}
