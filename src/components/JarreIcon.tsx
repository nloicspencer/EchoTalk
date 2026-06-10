// JarreIcon.tsx — Composant jarre SVG EchoTalk
// Usage : <JarreIcon color="blue" size="m" />

type JarreColor = 'blue' | 'rose';
type JarreSize = 's' | 'm' | 'l';

interface JarreIconProps {
  color: JarreColor;
  size?: JarreSize;
  className?: string;
  'aria-label'?: string;
}

const SIZE_MAP: Record<JarreSize, { width: number; height: number }> = {
  s: { width: 16, height: 20 },  // inline réactions
  m: { width: 24, height: 30 },  // header, navbar
  l: { width: 48, height: 60 },  // EchoProfil stats
};

const COLOR_MAP: Record<JarreColor, {
  capFill: string;
  capStroke: string;
  bodyFill: string;
  bodyStroke: string;
  waterFill: string;
  waterLine: string;
}> = {
  blue: {
    capFill: '#C8E6FA',
    capStroke: '#6DB8E8',
    bodyFill: '#E8F5FE',
    bodyStroke: '#6DB8E8',
    waterFill: '#5BA8D4',
    waterLine: '#5BA8D4',
  },
  rose: {
    capFill: '#FAD5E8',
    capStroke: '#D4537E',
    bodyFill: '#FEF0F6',
    bodyStroke: '#D4537E',
    waterFill: '#D4537E',
    waterLine: '#D4537E',
  },
};

// Compteur pour des clipPath IDs uniques (évite conflits SVG sur la même page)
let instanceCount = 0;

export function JarreIcon({
  color,
  size = 'm',
  className,
  'aria-label': ariaLabel,
}: JarreIconProps) {
  // ID unique pour le clipPath (sinon les SVG en double partagent le même clip)
  const id = `jarre-clip-${color}-${size}-${++instanceCount}`;

  const { width, height } = SIZE_MAP[size];
  const c = COLOR_MAP[color];
  const label = ariaLabel ?? (color === 'blue' ? 'Jarre bleue' : 'Jarre rose');

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 84"
      role="img"
      aria-label={label}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <defs>
        {/* Découpe le remplissage d'eau au contour de la jarre */}
        <clipPath id={id}>
          <rect x="14" y="22" width="36" height="50" rx="6" />
        </clipPath>
      </defs>

      {/* Bouchon / col */}
      <rect x="22" y="8" width="20" height="7" rx="2"
        fill={c.capFill} stroke={c.capStroke} strokeWidth="2" />

      {/* Corps de la jarre */}
      <rect x="14" y="22" width="36" height="50" rx="6"
        fill={c.bodyFill} stroke={c.bodyStroke} strokeWidth="2" />

      {/* Eau — jarre pleine (remplit le corps entier) */}
      <rect x="14" y="22" width="36" height="50"
        clipPath={`url(#${id})`}
        fill={c.waterFill} opacity="0.55" />

      {/* Épaules */}
      <line x1="18" y1="14" x2="14" y2="22"
        stroke={c.capStroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="14" x2="50" y2="22"
        stroke={c.capStroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default JarreIcon;
