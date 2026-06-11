import { motion } from "motion/react";

function SimCard3D() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow rings */}
      <div
        className="absolute rounded-full"
        style={{
          width: 380,
          height: 380,
          background: "radial-gradient(circle, rgba(0,85,165,0.15) 0%, transparent 70%)",
          animation: "pulse-ring 3s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 300,
          height: 300,
          background: "radial-gradient(circle, rgba(0,180,255,0.12) 0%, transparent 70%)",
          animation: "pulse-ring 3s ease-in-out infinite 1s",
        }}
      />

      {/* Orbiting data waves */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 6,
            height: 6,
            background: i % 2 === 0 ? "#00B4FF" : "#F39C12",
            boxShadow: `0 0 8px ${i % 2 === 0 ? "#00B4FF" : "#F39C12"}`,
            transform: `rotate(${deg}deg) translateX(150px)`,
            animation: `orbit 6s linear infinite`,
            animationDelay: `${i * -1}s`,
          }}
        />
      ))}

      {/* SIM Card */}
      <motion.div
        animate={{ y: [-12, 12, -12] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 180,
          height: 240,
          borderRadius: 20,
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(0,85,165,0.25) 50%, rgba(0,30,60,0.4) 100%)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.25)",
          boxShadow:
            "0 8px 32px rgba(0,85,165,0.4), 0 2px 8px rgba(0,180,255,0.2), inset 0 1px 0 rgba(255,255,255,0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* SIM chip */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: "50%",
            transform: "translateX(-50%)",
            width: 70,
            height: 52,
            borderRadius: 8,
            background:
              "linear-gradient(135deg, #FFD700 0%, #FFA500 30%, #B8860B 60%, #FFD700 100%)",
            boxShadow: "0 2px 8px rgba(255,165,0,0.4)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 40,
              height: 30,
              borderRadius: 4,
              border: "1px solid rgba(139,69,0,0.4)",
              background: "linear-gradient(135deg, #FFE57F, #FFC200)",
            }}
          />
        </div>
        {/* SIM cut corner */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 36,
            height: 36,
            background: "#001F3F",
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
          }}
        />
        {/* MobiFone text */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "white",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1,
            opacity: 0.9,
          }}
        >
          MobiFone
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "#F39C12",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 2,
          }}
        >
          5G ULTRA
        </div>
        {/* Shine effect */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
            borderRadius: 20,
          }}
        />
      </motion.div>

      {/* Network wave lines */}
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="absolute rounded-full"
          style={{
            width: n * 80 + 100,
            height: n * 80 + 100,
            border: `1px solid rgba(0,180,255,${0.12 - n * 0.03})`,
            borderRadius: "50%",
            animation: `expand-ring 3s ease-out infinite`,
            animationDelay: `${n * 0.8}s`,
          }}
        />
      ))}
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      style={{
        fontFamily: "'Outfit', sans-serif",
        background: "#001F3F",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
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

      {/* Background radial glows */}
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -100,
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,85,165,0.25) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -200,
          left: -100,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(243,156,18,0.12) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "20%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,180,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="relative w-full max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex-1 text-center lg:text-left"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                background: "rgba(0,85,165,0.2)",
                border: "1px solid rgba(0,85,165,0.4)",
                color: "#60B4FF",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#22C55E",
                  display: "inline-block",
                  boxShadow: "0 0 8px #22C55E",
                  animation: "pulse-ring 2s ease-in-out infinite",
                }}
              />
              Mạng 5G đang hoạt động tại 63 tỉnh thành
            </div>

            <h1
              style={{
                fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
                fontWeight: 900,
                lineHeight: 1.1,
                color: "white",
                marginBottom: "1.2rem",
              }}
            >
              Trải Nghiệm Dịch Vụ Số{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #F39C12, #FF5722)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                MobiFone Thế Hệ Mới
              </span>
            </h1>

            <p
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: "clamp(1rem, 2vw, 1.15rem)",
                lineHeight: 1.7,
                marginBottom: "2.5rem",
                maxWidth: 520,
                margin: "0 auto 2.5rem",
              }}
              className="lg:mx-0"
            >
              Kết nối siêu tốc, trải nghiệm không giới hạn. MobiFone mang đến hệ sinh thái số toàn diện cho cuộc sống hiện đại của bạn.
            </p>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: "linear-gradient(135deg, #F39C12, #FF5722)",
                  color: "white",
                  padding: "14px 32px",
                  borderRadius: 12,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: "0 4px 24px rgba(243,156,18,0.45), 0 2px 8px rgba(255,87,34,0.3)",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Đăng ký gói cước
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04, background: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: "transparent",
                  color: "white",
                  padding: "14px 32px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.3)",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  backdropFilter: "blur(8px)",
                  fontFamily: "'Outfit', sans-serif",
                  transition: "background 0.2s",
                }}
              >
                Khám phá eSIM
              </motion.button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-10 justify-center lg:justify-start">
              {[
                { value: "63+", label: "Tỉnh thành" },
                { value: "99.9%", label: "Uptime" },
                { value: "30M+", label: "Thuê bao" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    style={{
                      fontSize: "1.6rem",
                      fontWeight: 800,
                      background: "linear-gradient(90deg, #F39C12, #FF5722)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500 }}>
                    {stat.label}
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
