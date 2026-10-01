import { useId } from "react";
import { markGeometry, polygonPoints, rimPath } from "./mark";

export interface BrandMarkProps {
  /** Rendered size in CSS pixels (square). */
  size?: number;
  className?: string;
}

/**
 * In-app brand mark. Drawn from the same geometry as the Windows/macOS/Linux app icon
 * (`./mark.ts`), without the icon's obsidian plate because the shell is already obsidian.
 * Decorative: the adjacent "MDX Studio" text carries the name.
 */
export function BrandMark({ size = 26, className }: BrandMarkProps) {
  const maskId = `mdx-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const g = markGeometry({ size, plate: false });
  const art = (
    <>
      {g.faces.map((face) => (
        <polygon
          key={face.id}
          points={polygonPoints(face.polygon)}
          fill={face.fill}
          fillOpacity={face.opacity}
        />
      ))}
      <path d={rimPath(g)} fill={g.edgeColor} fillRule="evenodd" />
      {g.legs.map(([a, b], index) => (
        <line
          key={index}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={g.edgeColor}
          strokeWidth={g.legWidth}
          strokeLinecap="round"
        />
      ))}
    </>
  );
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
      data-testid="brand-mark"
    >
      {g.particle === null ? (
        art
      ) : (
        <>
          <defs>
            <mask id={maskId}>
              <rect width={size} height={size} fill="#fff" />
              <circle cx={g.center.x} cy={g.center.y} r={g.particle.clearance} fill="#000" />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>{art}</g>
          <circle cx={g.center.x} cy={g.center.y} r={g.particle.radius} fill={g.particle.fill} />
        </>
      )}
    </svg>
  );
}
