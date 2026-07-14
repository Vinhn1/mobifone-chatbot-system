import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, ChevronLeft, Shield, Mail } from "lucide-react";
import { MobiFoneLogo } from "../components/MobiFoneLogo";
import axios from "axios";

type Step = 1 | 2 | 3 | 4;

const API_BASE = "http://localhost:3000";

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

function StepDots({ step }: { step: Step }) {
  const labels = ["Email", "OTP", "Mật khẩu", "Hoàn tất"];
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-gradient-to-br from-red-600 to-red-500 text-white"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
              }`}>
                {done ? <CheckCircle2 size={14} /> : n}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                active ? "text-red-500" : "text-slate-400"
              }`}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={`w-8 h-[2px] mx-1 mb-4 transition-colors duration-300 ${
                done ? "bg-emerald-500" : "bg-slate-200"
              }`} />
            )}
          </div>
        );
      })}
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

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  // Đếm ngược 60s cho việc gửi lại OTP
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : password.match(/[A-Z]/) && password.match(/[0-9]/) ? 4 : 3;
  const strengthColors = ["", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];
  const strengthTextColors = ["", "text-red-500", "text-amber-500", "text-blue-500", "text-emerald-500"];
  const strengthLabels = ["", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"];

  const handleSendOtp = async () => {
    if (!email || !email.includes("@")) {
      setError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API_BASE}/auth/forgot-password`, { email });
      if (response.data?.success) {
        setTimer(60);
        setStep(2);
      } else {
        setError(response.data?.message || "Không thể gửi mã OTP.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Email không khớp với bất kỳ tài khoản nào trên hệ thống.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Vui lòng nhập đầy đủ mã OTP 6 chữ số.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API_BASE}/auth/verify-reset-otp`, { email, otpCode: otp });
      if (response.data?.success) {
        setStep(3);
      } else {
        setError(response.data?.message || "Mã OTP không chính xác.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Mã OTP không chính xác hoặc đã hết hạn.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password.length < 6) {
      setError("Mật khẩu phải chứa ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirmPw) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API_BASE}/auth/reset-password`, {
        email,
        otpCode: otp,
        password,
      });
      if (response.data?.success) {
        setStep(4);
      } else {
        setError(response.data?.message || "Không thể đặt lại mật khẩu.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Yêu cầu khôi phục mật khẩu không hợp lệ hoặc đã hết hạn.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 relative overflow-hidden font-outfit">
      {/* Background radial glow orbs */}
      <div className="absolute -top-[200px] -right-[100px] w-[500px] h-[500px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(0,85,165,0.06)_0%,transparent_70%)]" />
      <div className="absolute -bottom-[150px] -left-[100px] w-[400px] h-[400px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(228,0,43,0.04)_0%,transparent_70%)]" />

      {/* Back to Login Button */}
      <Link
        to="/login"
        className="fixed top-6 left-6 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl px-4 py-2 text-slate-600 hover:text-slate-800 cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-xs transition-all duration-200 no-underline"
      >
        <ChevronLeft size={16} /> Đăng nhập
      </Link>

      <div className="flex gap-16 items-center justify-center max-w-[420px] w-full relative z-10">
        <div className="w-full bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <MobiFoneLogo size={36} dark={true} />
          </div>

          <h2 className="text-center text-slate-800 font-extrabold text-lg mb-2">Khôi phục mật khẩu</h2>
          <StepDots step={step} />

          {/* Bước 1: Nhập Email */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-1">
                Nhập địa chỉ Email đăng ký để nhận mã xác thực OTP khôi phục mật khẩu.
              </p>
              <BrandInput icon={Mail} placeholder="Địa chỉ Email" value={email} onChange={setEmail} />

              {error && (
                <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg p-2.5 font-semibold animate-pulse">
                  {error}
                </div>
              )}

              <button
                disabled={!email.includes("@") || isLoading}
                onClick={handleSendOtp}
                className={`w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-md transition-all duration-200 border-none flex items-center justify-center gap-2 ${
                  email.includes("@") && !isLoading
                    ? "cursor-pointer opacity-100 hover:shadow-lg shadow-red-500/20 active:scale-98"
                    : "cursor-not-allowed opacity-50"
                }`}
              >
                {isLoading ? "Đang gửi OTP..." : "Gửi mã OTP"} <ArrowRight size={17} />
              </button>
            </div>
          )}

          {/* Bước 2: Xác thực mã OTP */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-3">
                  Mã OTP khôi phục mật khẩu đã được gửi đến email <span className="text-slate-700 font-bold">{email}</span>.
                </p>
              </div>

              <OTPBoxes value={otp} onChange={setOtp} />

              {error && (
                <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg p-2.5 font-semibold animate-pulse">
                  {error}
                </div>
              )}

              <button
                disabled={otp.length !== 6 || isLoading}
                onClick={handleVerifyOtp}
                className={`w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-md transition-all duration-200 border-none flex items-center justify-center gap-2 ${
                  otp.length === 6 && !isLoading
                    ? "cursor-pointer opacity-100 hover:shadow-lg shadow-red-500/20 active:scale-98"
                    : "cursor-not-allowed opacity-50"
                }`}
              >
                {isLoading ? "Đang xác thực..." : "Xác thực mã OTP"} <ArrowRight size={17} />
              </button>

              <div className="text-center mt-2 flex flex-col gap-2.5">
                {timer > 0 ? (
                  <span className="text-slate-400 text-xs font-semibold">
                    Gửi lại mã sau <span className="text-blue-600 font-bold">{timer}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleSendOtp}
                    className="bg-transparent border-none text-blue-600 hover:text-blue-700 cursor-pointer text-xs font-bold transition-all"
                  >
                    Gửi lại mã OTP qua Email
                  </button>
                )}

                <button
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
                  className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 text-xs font-bold flex items-center gap-1 justify-center self-center"
                >
                  <ChevronLeft size={14} /> Quay lại nhập Email
                </button>
              </div>
            </div>
          )}

          {/* Bước 3: Đổi mật khẩu */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-1">
                Thiết lập mật khẩu mới cho tài khoản của bạn.
              </p>
              <BrandInput icon={Lock} placeholder="Mật khẩu mới (ít nhất 6 ký tự)" type="password" value={password} onChange={setPassword} />
              
              {password.length > 0 && (
                <div>
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4].map(n => (
                      <div
                        key={n}
                        className={`flex-1 h-[3px] rounded-full transition-colors duration-300 ${
                          n <= pwStrength ? strengthColors[pwStrength] : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[11px] font-bold ${strengthTextColors[pwStrength]}`}>
                    Độ mạnh: {strengthLabels[pwStrength]}
                  </span>
                </div>
              )}

              <BrandInput icon={Shield} placeholder="Xác nhận mật khẩu" type="password" value={confirmPw} onChange={setConfirmPw} />

              {error && (
                <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg p-2.5 font-semibold animate-pulse">
                  {error}
                </div>
              )}

              <button
                disabled={password.length < 6 || password !== confirmPw || isLoading}
                onClick={handleResetPassword}
                className={`w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-md transition-all duration-200 border-none flex items-center justify-center gap-2 ${
                  password.length >= 6 && password === confirmPw && !isLoading
                    ? "cursor-pointer opacity-100 hover:shadow-lg shadow-red-500/20 active:scale-98"
                    : "cursor-not-allowed opacity-50"
                }`}
              >
                {isLoading ? "Đang cập nhật..." : "Đặt lại mật khẩu"} <ArrowRight size={17} />
              </button>
            </div>
          )}

          {/* Bước 4: Hoàn tất */}
          {step === 4 && (
            <div className="flex flex-col items-center gap-5 text-center py-2 animate-[scaleIn_0.3s_ease-out]">
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-slate-800 font-extrabold text-xl mb-1">Cập nhật thành công!</h3>
                <p className="text-slate-400 text-sm font-semibold">Mật khẩu của bạn đã được thay đổi. Hãy sử dụng mật khẩu mới để đăng nhập.</p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-sm cursor-pointer shadow-md hover:shadow-lg shadow-red-500/20 active:scale-98 transition-all border-none flex items-center justify-center gap-2"
              >
                Đến trang đăng nhập <ArrowRight size={17} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
