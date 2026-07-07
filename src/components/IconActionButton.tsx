import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ActionIcon, type ActionIconName } from "@/lib/action-icons";

type IconActionButtonProps = {
  icon: ActionIconName;
  label: string;
  text?: string;
  showLabel?: boolean;
  tooltipPlacement?: "top" | "right";
  variant?: "neutral" | "primary" | "success" | "danger" | "secondary" | "exam" | "exam-active";
  size?: "sm" | "md" | "lg";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function IconActionButton({
  icon,
  label,
  text,
  showLabel = false,
  tooltipPlacement = "top",
  variant = "neutral",
  size = "md",
  className = "",
  type = "button",
  ...props
}: IconActionButtonProps) {
  const classes = [
    "icon-action-btn",
    `icon-action-btn--${variant}`,
    `icon-action-btn--${size}`,
    showLabel ? "icon-action-btn--labeled" : "",
    !showLabel && tooltipPlacement === "right" ? "icon-action-btn--tooltip-right" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const visibleText = text ?? label;

  return (
    <button
      type={type}
      className={classes}
      aria-label={label}
      data-tooltip={showLabel ? undefined : label}
      title={label}
      {...props}
    >
      <ActionIcon name={icon} />
      {showLabel ? <span className="icon-action-btn__label">{visibleText}</span> : null}
    </button>
  );
}

export function IconActionGroup({ children }: { children: ReactNode }) {
  return <div className="icon-action-group">{children}</div>;
}
