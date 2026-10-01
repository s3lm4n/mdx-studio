import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "../components/Badge";

/** Glyph + word, without a chip. For status lines inside cards where a pill would be too loud. */
export function StatusDot({
  tone,
  children,
  title,
}: {
  tone: BadgeTone;
  children: ReactNode;
  title?: string;
}) {
  return (
    <Badge tone={tone} appearance="plain" {...(title === undefined ? {} : { title })}>
      {children}
    </Badge>
  );
}
