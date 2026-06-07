import type { ReactNode } from "react";

export type GlowColor = "cyan" | "green" | "purple" | "pink" | "amber" | "white";
export type ButtonVariant = "primary" | "success" | "danger" | "ghost" | "white";

export interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  glowColor?: GlowColor;
  padding?: "sm" | "md" | "lg";
  id?: string;
}

export interface GlowButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  id?: string;
}

export interface MatrixTextProps {
  text: string;
  speed?: number; // ms per character
  color?: GlowColor;
  className?: string;
  continuous?: boolean;
  onComplete?: () => void;
  disabledAnimation?: boolean;
}

export interface CyberSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  label?: string;
  formatValue?: (value: number) => string;
  glowColor?: GlowColor;
  className?: string;
  ticks?: number[];
  id?: string;
}

export interface DataLabelProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: GlowColor;
  className?: string;
  size?: "sm" | "md";
}

export interface TickerEvent {
  id: string;
  timestamp: Date;
  message: string;
  type: "coordinate" | "event" | "alert" | "system";
}
