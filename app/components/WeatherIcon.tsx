type WeatherIconProps = {
  code: number;
  className?: string;
  title?: string;
};

export default function WeatherIcon({ code, className = "", title }: WeatherIconProps) {
  const thunder = code >= 200 && code < 300;
  const rain = code >= 300 && code < 700;
  const clear = code === 800;
  const partlyCloudy = code === 801 || code === 802;

  return (
    <svg className={`weatherGlyph ${className}`.trim()} viewBox="0 0 64 64" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      {(clear || partlyCloudy) ? <g className="weatherGlyphSun"><circle cx="23" cy="23" r="9" /><path d="M23 6v6M23 34v6M6 23h6M34 23h6M11 11l4 4M31 31l4 4M35 11l-4 4M15 31l-4 4" /></g> : null}
      {!clear ? <g className="weatherGlyphCloud"><path d="M18 44h28a10 10 0 0 0 1-20 15 15 0 0 0-28-4 12 12 0 0 0-1 24Z" /></g> : null}
      {rain ? <g className="weatherGlyphRain"><path d="m24 49-3 7M34 49l-3 7M44 49l-3 7" /></g> : null}
      {thunder ? <path className="weatherGlyphBolt" d="M35 42h9l-8 9h6L29 63l4-10h-6Z" /> : null}
    </svg>
  );
}
