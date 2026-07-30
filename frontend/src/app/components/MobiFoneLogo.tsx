export function MobiFoneLogo({ size = 28, height, className }: { size?: number; height?: number; dark?: boolean; showText?: boolean; className?: string }) {
  const logoHeight = height || size;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", userSelect: "none" }} className={className}>
      <img
        src="/logo.png"
        alt="MobiFone"
        style={{
          height: logoHeight,
          width: "auto",
          maxHeight: "100%",
          objectFit: "contain",
          display: "block"
        }}
      />
    </div>
  );
}
