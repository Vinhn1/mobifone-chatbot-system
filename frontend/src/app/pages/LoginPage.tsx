import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Lock, Phone, Eye, EyeOff, ArrowRight, CheckCircle2, ChevronLeft, Shield, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MobiFoneLogo } from "../components/MobiFoneLogo";
import axios from "axios";

type Tab = "login" | "register";
type Step = 1 | 2 | 3 | 4;

import { API_BASE } from "../../config";

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

function LoginForm() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
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
    const role = await login(id, pw);
    if (role === "admin" || role === "sales") {
      navigate("/admin");
    } else if (role === "user") {
      navigate("/dashboard");
    } else if (role === "require_2fa") {
      setLoginId(id);
      setIs2faRequired(true);
    } else {
      setError("Thông tin đăng nhập không chính xác");
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
    } else if (role === "user") {
      navigate("/dashboard");
    } else {
      setError("Mã OTP không chính xác hoặc đã hết hạn");
      setIsVerifying(false);
    }
  };

  if (is2faRequired) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-3">
            Mã OTP xác thực 2 lớp đã được gửi đến email đăng ký của bạn. Vui lòng nhập mã để hoàn tất đăng nhập.
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
          className={`w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-md transition-all duration-200 border-none flex items-center justify-center gap-2 ${
            otp.length === 6 && !isVerifying
              ? "cursor-pointer opacity-100 hover:shadow-lg shadow-red-500/20 active:scale-98"
              : "cursor-not-allowed opacity-50"
          }`}
        >
          {isVerifying ? "Đang xác thực..." : "Xác thực OTP 2FA"} <ArrowRight size={17} />
        </button>

        <button
          onClick={() => {
            setIs2faRequired(false);
            setOtp("");
            setError("");
          }}
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
        <BrandInput icon={Mail} placeholder="Địa chỉ Email" value={id} onChange={setId} />
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
        className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm cursor-pointer shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 hover:scale-102 active:scale-98 transition-all duration-200 border-none flex items-center justify-center gap-2"
      >
        Đăng nhập <ArrowRight size={17} />
      </button>
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

function RegisterFlow() {
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [regError, setRegError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const { register } = useAuth();
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

  return (
    <div className="flex flex-col gap-4">
      <StepDots step={step} />
      
      {/* Bước 1: Nhập thông tin Email */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-1">
            Nhập địa chỉ Email để nhận mã OTP xác thực
          </p>
          <BrandInput icon={Mail} placeholder="Địa chỉ Email (để nhận OTP)" value={email} onChange={setEmail} />
          
          {regError && (
            <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg p-2.5 font-semibold">
              {regError}
            </div>
          )}
          
          <button
            disabled={!email.includes("@") || isLoading}
            onClick={async () => {
              setIsLoading(true);
              setRegError("");
              try {
                const response = await axios.post(`${API_BASE}/subscribers/otp/send`, { 
                  email: email
                });
                if (response.data?.success) {
                  setTimer(60);
                  setStep(2);
                } else {
                  setRegError(response.data?.message || "Không thể gửi OTP.");
                }
              } catch (error: any) {
                console.error("Gửi OTP thất bại:", error);
                setRegError(error.response?.data?.message || "Lỗi kết nối máy chủ gửi OTP.");
              } finally {
                setIsLoading(false);
              }
            }}
            className={`w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-md transition-all duration-200 border-none flex items-center justify-center gap-2 ${
              email.includes("@") && !isLoading
                ? "cursor-pointer opacity-100 hover:shadow-lg shadow-red-500/20 active:scale-98"
                : "cursor-not-allowed opacity-50"
            }`}
          >
            {isLoading ? "Đang gửi..." : "Gửi mã OTP qua Email"} <ArrowRight size={17} />
          </button>
        </div>
      )}

      {/* Bước 2: Nhập OTP xác thực */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <p className="text-slate-500 text-xs sm:text-sm font-semibold">
            Mã OTP đã được gửi đến email <strong className="text-slate-800">{email}</strong>
          </p>
          
          <OTPBoxes value={otp} onChange={setOtp} />
          
          {regError && (
            <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg p-2.5 font-semibold">
              {regError}
            </div>
          )}
          
          <button
            disabled={otp.length !== 6 || isLoading}
            onClick={async () => {
              setIsLoading(true);
              setRegError("");
              try {
                const response = await axios.post(`${API_BASE}/subscribers/otp/verify`, {
                  email: email,
                  otpCode: otp
                });
                const data = response.data;
                if (data?.token && data?.subscriber) {
                  const sub = data.subscriber;
                  setPhone(sub.phoneNumber); // Lưu lại số điện thoại tự sinh từ Backend
                  const mappedUser = {
                    id: sub.id,
                    name: sub.name || `Thành viên ${sub.phoneNumber.slice(-4)}`,
                    phone: sub.phoneNumber,
                    email: sub.email || email || `${sub.phoneNumber}@mobifone.vn`,
                    role: "user",
                    tier: "Gold",
                    package: sub.currentPackage ? `${sub.currentPackage} Ultra` : "Không có gói",
                    packageCode: sub.currentPackage || "",
                    packageExpiry: sub.packageExpiry ? new Date(sub.packageExpiry).toLocaleDateString("vi-VN") : "N/A",
                    dataUsedGB: sub.dataUsedGB || 0,
                    dataTotalGB: sub.dataTotalGB || 0,
                    voiceUsedMin: 0,
                    voiceTotalMin: sub.currentPackage ? 600 : 0,
                    balance: 150000,
                    points: 1200,
                    joinDate: sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN"),
                    address: sub.address || "Chưa cập nhật",
                    dob: sub.dob || "01/01/1990",
                    avatar: sub.avatar || undefined,
                  };
                  localStorage.setItem("mobifone_portal_token", data.token);
                  localStorage.setItem("mobifone_portal_user", JSON.stringify(mappedUser));
                  setStep(3);
                } else {
                  setRegError("Không thể xác thực OTP.");
                }
              } catch (error: any) {
                console.error("Xác thực OTP thất bại:", error);
                setRegError(error.response?.data?.message || "Mã OTP không chính xác.");
              } finally {
                setIsLoading(false);
              }
            }}
            className={`w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-md transition-all duration-200 border-none flex items-center justify-center gap-2 ${
              otp.length === 6 && !isLoading
                ? "cursor-pointer opacity-100 hover:shadow-lg shadow-red-500/20 active:scale-98"
                : "cursor-not-allowed opacity-50"
            }`}
          >
            {isLoading ? "Đang xác thực..." : "Xác thực OTP"} <ArrowRight size={17} />
          </button>

          {/* Nút gửi lại mã OTP hoặc đếm ngược */}
          <div className="text-center mt-1">
            {timer > 0 ? (
              <span className="text-slate-400 text-xs font-semibold">
                Gửi lại mã sau <strong className="text-blue-600">{timer}s</strong>
              </span>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  setRegError("");
                  try {
                    const response = await axios.post(`${API_BASE}/subscribers/otp/send`, {
                      email: email
                    });
                    if (response.data?.success) {
                      setTimer(60);
                    } else {
                      setRegError(response.data?.message || "Không thể gửi lại OTP.");
                    }
                  } catch (err: any) {
                    setRegError(err.response?.data?.message || "Lỗi khi gửi lại mã OTP.");
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="bg-transparent border-none text-blue-600 hover:text-blue-700 cursor-pointer text-xs font-bold transition-all"
              >
                Gửi lại mã OTP qua Email
              </button>
            )}
          </div>

          <button
            onClick={() => setStep(1)}
            className="background-none border-none cursor-pointer text-slate-400 hover:text-slate-600 text-xs font-bold flex items-center gap-1 justify-center mt-1"
          >
            <ChevronLeft size={14} /> Quay lại bước 1
          </button>
        </div>
      )}

      {/* Bước 3: Thiết lập mật khẩu mới */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
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
          
          {regError && (
            <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg p-2.5 font-semibold">
              {regError}
            </div>
          )}
          
          <button
            disabled={password.length < 6 || password !== confirmPw}
            onClick={async () => {
              setRegError("");
              const result = await register(phone, password);
              if (result === "success") setStep(4);
              else setRegError("Đăng ký thất bại. Số điện thoại có thể đã tồn tại.");
            }}
            className={`w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-md transition-all duration-200 border-none flex items-center justify-center gap-2 ${
              password.length >= 6 && password === confirmPw
                ? "cursor-pointer opacity-100 hover:shadow-lg shadow-red-500/20 active:scale-98"
                : "cursor-not-allowed opacity-50"
            }`}
          >
            Tạo tài khoản <ArrowRight size={17} />
          </button>
        </div>
      )}

      {/* Bước 4: Đăng ký hoàn tất */}
      {step === 4 && (
        <div className="flex flex-col items-center gap-5 text-center py-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h3 className="text-slate-800 font-extrabold text-xl mb-1">Tài khoản đã tạo thành công!</h3>
            <p className="text-slate-400 text-sm font-semibold">Chào mừng bạn đến với MobiFone Portal 🎉</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-sm cursor-pointer shadow-md hover:shadow-lg shadow-red-500/20 active:scale-98 transition-all border-none flex items-center justify-center gap-2"
          >
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 relative overflow-hidden font-outfit">
      {/* Background radial glow orbs */}
      <div className="absolute -top-[200px] -right-[100px] w-[500px] h-[500px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(0,85,165,0.06)_0%,transparent_70%)]" />
      <div className="absolute -bottom-[150px] -left-[100px] w-[400px] h-[400px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(228,0,43,0.04)_0%,transparent_70%)]" />

      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="fixed top-6 left-6 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl px-4 py-2 text-slate-600 hover:text-slate-800 cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-xs transition-all duration-200"
      >
        <ChevronLeft size={16} /> Trang chủ
      </button>

      <div className="flex gap-16 items-center justify-center max-w-[420px] w-full relative z-10">
        {/* Auth card */}
        <div className="w-full bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <MobiFoneLogo size={36} dark={true} />
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 border border-slate-200/50 rounded-2xl p-1 mb-6">
            {(["login", "register"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl border-none cursor-pointer font-bold text-xs transition-all duration-250 ${
                  tab === t
                    ? "bg-white text-red-600 shadow-xs border border-slate-200/30"
                    : "text-slate-400 hover:text-slate-700 bg-transparent"
                }`}
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
