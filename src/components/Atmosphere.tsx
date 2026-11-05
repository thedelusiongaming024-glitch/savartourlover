interface AtmosphereProps {
  className?: string;
  /** Intensity of the blobs (0.3 default) */
  intensity?: number;
}

/**
 * Soft, colorful blurred shapes that sit behind the frosted glass
 * panels — the diffuse colour the glass refracts. A large pearl-and-sky
 * bloom leads, with emerald, gold, and azure accents layered beneath it.
 */
export function Atmosphere({ className, intensity = 0.3 }: AtmosphereProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      {/* Sky-glass bloom — the light the glass panels catch */}
      <div
        className="atmosphere-blob absolute -top-32 left-1/4 h-[36rem] w-[36rem] rounded-full blur-[110px]"
        style={{
          background: `radial-gradient(circle, rgba(180,220,242,${intensity * 1.15}) 0%, rgba(224,241,250,${intensity * 0.6}) 48%, transparent 72%)`,
          animationDuration: "20s",
        }}
      />
      <div
        className="atmosphere-blob absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl"
        style={{
          background: `rgba(14,107,85,${intensity * 0.75})`,
          animationDuration: "15s",
        }}
      />
      <div
        className="atmosphere-blob absolute top-1/3 -right-20 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{
          background: `rgba(201,153,63,${intensity * 0.7})`,
          animationDuration: "19s",
          animationDelay: "-4s",
        }}
      />
      <div
        className="atmosphere-blob absolute -bottom-24 left-1/3 h-80 w-80 rounded-full blur-3xl"
        style={{
          background: `rgba(120,196,232,${intensity * 0.75})`,
          animationDuration: "22s",
          animationDelay: "-9s",
        }}
      />
    </div>
  );
}
