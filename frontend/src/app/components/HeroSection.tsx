import { motion } from "motion/react";

function SimCard3D() {
  return (
    <div className="relative flex items-center justify-center" style={{ perspective: 1000 }}>
      {/* Outer glow rings */}
      <div
        className="absolute rounded-full w-[380px] h-[380px] opacity-60 pointer-events-none animate-[pulse-ring_3s_ease-in-out_infinite]"
        style={{
          background: "radial-gradient(circle, rgba(0,85,165,0.08) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute rounded-full w-[300px] h-[300px] opacity-60 pointer-events-none animate-[pulse-ring_3s_ease-in-out_infinite_1s]"
        style={{
          background: "radial-gradient(circle, rgba(228,0,43,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Orbiting data waves */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <div
          key={i}
          className="absolute rounded-full w-1.5 h-1.5 pointer-events-none"
          style={{
            background: i % 2 === 0 ? "#0055A5" : "#E4002B",
            boxShadow: `0 0 8px ${i % 2 === 0 ? "#0055A5" : "#E4002B"}`,
            transform: `rotate(${deg}deg) translateX(150px)`,
            animation: `orbit 6s linear infinite`,
            animationDelay: `${i * -1}s`,
          }}
        />
      ))}

      {/* 3D SIM Card */}
      <motion.div
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{
          rotateY: 18,
          rotateX: -12,
          scale: 1.05,
          boxShadow: "0 25px 50px -12px rgba(0, 85, 165, 0.25), 0 0 0 1px rgba(0, 85, 165, 0.15)",
        }}
        className="w-[180px] h-[240px] rounded-3xl bg-white/50 backdrop-blur-xl border border-white/80 shadow-lg shadow-blue-500/10 relative overflow-hidden cursor-pointer transition-shadow duration-300 transform-gpu"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* SIM chip */}
        <div
          className="absolute top-7 left-1/2 -translate-x-1/2 w-[70px] h-[52px] rounded-lg shadow-md shadow-amber-500/20"
          style={{
            background: "linear-gradient(135deg, #FFD700 0%, #FFA500 30%, #B8860B 60%, #FFD700 100%)",
            transform: "translateZ(20px)",
          }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-7 rounded border border-amber-800/20"
            style={{
              background: "linear-gradient(135deg, #FFE57F, #FFC200)",
            }}
          />
        </div>

        {/* SIM cut corner */}
        <div
          className="absolute top-0 left-0 w-9 h-9 bg-slate-100"
          style={{
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
          }}
        />

        {/* MobiFone text */}
        <div
          className="absolute bottom-5 left-0 right-0 text-center text-sm font-extrabold tracking-wide"
          style={{ transform: "translateZ(15px)", fontFamily: "'Outfit', sans-serif" }}
        >
          <span className="text-[#0055A5]">mobi</span><span className="text-[#E4002B]">fone</span>
        </div>
        <div
          className="absolute bottom-1.5 left-0 right-0 text-center text-red-500 text-[9px] font-bold tracking-widest"
          style={{ transform: "translateZ(10px)" }}
        >
          5G ULTRA
        </div>

        {/* Brand wave overlay */}
        <div
          className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full pointer-events-none blur-xl opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(228,0,43,0.4) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -top-10 -left-10 w-28 h-28 rounded-full pointer-events-none blur-xl opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(0,85,165,0.4) 0%, transparent 70%)",
          }}
        />

        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 pointer-events-none" />
      </motion.div>

      {/* Network wave lines */}
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="absolute rounded-full pointer-events-none animate-[expand-ring_3s_ease-out_infinite]"
          style={{
            width: n * 80 + 100,
            height: n * 80 + 100,
            border: `1px solid rgba(0,85,165,${0.1 - n * 0.02})`,
            animationDelay: `${n * 0.8}s`,
          }}
        />
      ))}
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-white overflow-hidden flex items-center pt-16 font-outfit">
      {/* Blueprint Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0055A504_1px,transparent_1px),linear-gradient(to_bottom,#0055A504_1px,transparent_1px)] bg-[size:30px_30px]" />
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(150px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(150px) rotate(-360deg); }
        }
        @keyframes expand-ring {
          0% { transform: scale(0.85); opacity: 0.6; }
          100% { transform: scale(1.15); opacity: 0; }
        }
      `}</style>

      {/* Background radial glows with richer brand colors */}
      <div className="absolute -top-[150px] -right-[100px] w-[700px] h-[700px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(0,85,165,0.14)_0%,transparent_70%)] blur-3xl" />
      <div className="absolute -bottom-[150px] -left-[100px] w-[600px] h-[600px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(228,0,43,0.09)_0%,transparent_70%)] blur-3xl" />
      <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(0,85,165,0.06)_0%,transparent_75%)] blur-3xl" />

      {/* Decorative Fluid Brand Waves in the background (MobiFone Signature) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Blue Flowing Wave */}
        <div 
          className="absolute -right-[15%] bottom-[5%] w-[60%] h-[70%] rounded-[45%_55%_60%_40%_/_45%_50%_40%_55%] bg-gradient-to-tr from-[#0055A5]/12 via-[#0055A5]/4 to-transparent blur-3xl animate-[pulse_8s_ease-in-out_infinite]"
        />
        {/* Red Flowing Wave */}
        <div 
          className="absolute -right-[5%] -bottom-[10%] w-[50%] h-[60%] rounded-[50%_45%_55%_45%_/_40%_55%_45%_60%] bg-gradient-to-tr from-[#E4002B]/9 via-[#E4002B]/2 to-transparent blur-2xl animate-[pulse_10s_ease-in-out_infinite]"
        />
        {/* Sky Blue Highlight */}
        <div 
          className="absolute right-[20%] top-[10%] w-[40%] h-[50%] rounded-full bg-[#00B4FF]/6 blur-3xl"
        />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex-1 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 bg-[#0055A5]/5 border border-[#0055A5]/15 text-[#0055A5] text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#10B981] animate-pulse" />
              Mạng 5G đang hoạt động tại 63 tỉnh thành
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15] mb-5">
              <span className="block text-slate-900">Trải Nghiệm Dịch Vụ Số</span>
              <span className="block mt-2">
                <span className="text-[#0055A5] drop-shadow-xs">Mobi</span>
                <span className="text-[#E4002B] drop-shadow-xs">Fone</span>{" "}
                <span className="bg-gradient-to-r from-[#0055A5] to-[#E4002B] bg-clip-text text-transparent">
                  Thế Hệ Mới
                </span>
              </span>
            </h1>

            <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Kết nối siêu tốc, trải nghiệm không giới hạn. MobiFone mang đến hệ sinh thái số toàn diện cho cuộc sống hiện đại của bạn.
            </p>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <motion.button
                whileHover={{ scale: 1.04, translateY: -1 }}
                whileTap={{ scale: 0.97 }}
                className="bg-[#0055A5] hover:bg-[#00448A] text-white px-8 py-3.5 rounded-2xl font-bold text-sm cursor-pointer shadow-lg shadow-[#0055A5]/25 hover:shadow-xl hover:shadow-[#0055A5]/35 transition-all duration-200 border-none"
              >
                Đăng ký gói cước
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04, translateY: -1 }}
                whileTap={{ scale: 0.97 }}
                className="bg-white hover:bg-[#0055A5]/5 text-slate-700 hover:text-[#0055A5] border border-slate-200 hover:border-[#0055A5]/30 px-8 py-3.5 rounded-2xl font-semibold text-sm cursor-pointer shadow-xs transition-all duration-200"
              >
                Khám phá eSIM
              </motion.button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-12 justify-center lg:justify-start">
              {[
                { value: "63+", label: "Tỉnh thành" },
                { value: "99.9%", label: "Uptime" },
                { value: "30M+", label: "Thuê bao" },
              ].map((stat) => (
                <div key={stat.label} className="text-left">
                  <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#0055A5] to-[#E4002B] bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-slate-500 text-xs font-bold tracking-wide mt-0.5">
                    {stat.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: 3D SIM Card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="flex-1 flex items-center justify-center"
          >
            <SimCard3D />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
