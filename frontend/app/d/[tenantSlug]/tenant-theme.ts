import type { CSSProperties } from "react";

const DEFAULT_PRIMARY_COLOR = "#10b981";
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

type TenantThemeStyle = CSSProperties & {
  "--tenant-primary": string;
  "--tenant-primary-hover": string;
  "--tenant-primary-rgb": string;
  "--tenant-primary-soft": string;
};

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function darken(hex: string, amount = 0.14) {
  const { r, g, b } = hexToRgb(hex);
  return `#${[r, g, b]
    .map((channel) => clampChannel(channel * (1 - amount)).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function tenantThemeStyle(primaryColor?: string): TenantThemeStyle {
  const color = HEX_COLOR_RE.test(primaryColor || "") ? primaryColor!.toLowerCase() : DEFAULT_PRIMARY_COLOR;
  const { r, g, b } = hexToRgb(color);

  return {
    "--tenant-primary": color,
    "--tenant-primary-hover": darken(color),
    "--tenant-primary-rgb": `${r} ${g} ${b}`,
    "--tenant-primary-soft": `rgba(${r}, ${g}, ${b}, 0.12)`,
  };
}
