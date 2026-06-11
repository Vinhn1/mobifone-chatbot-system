export function MobiFoneLogo({ size = 28, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}>
      {/* Brand Waves */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2.5, height: size - 8 }}>
        <div style={{ width: 3.5, height: "35%", backgroundColor: "#0055A5", borderRadius: 1.5 }} />
        <div style={{ width: 3.5, height: "65%", backgroundColor: "#007FFF", borderRadius: 1.5 }} />
        <div style={{ width: 3.5, height: "95%", backgroundColor: "#E4002B", borderRadius: 1.5 }} />
      </div>
      <span style={{
        color: dark ? "#0F172A" : "white",
        fontSize: size - 8,
        fontWeight: 900,
        letterSpacing: -0.5,
        fontFamily: "'Outfit', sans-serif"
      }}>
        mobi<span style={{ color: "#E4002B" }}>fone</span>
      </span>
    </div>
  );
}
