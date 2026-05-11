import type { ReactElement } from "react";
import type { Platform } from "@/lib/platform";

export type PlatformIconVariant =
  | "default"
  | "xhs_original"
  | "xhs_bold"
  | "xhs_badge"
  | "xhs_red"
  | "xhs_shu";

interface PlatformIconProps {
  platform: Platform;
  size?: number;
  variant?: PlatformIconVariant;
}

function renderXiaohongshuIcon(
  size: number,
  variant: PlatformIconVariant
): ReactElement {
  const iconProps = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    xmlns: "http://www.w3.org/2000/svg",
    focusable: "false" as const,
    shapeRendering: "geometricPrecision" as const,
  };

  if (variant === "xhs_badge") {
    return (
      <svg {...iconProps}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#FF2442" />
        <rect x="4.3" y="5" width="15.4" height="14" rx="3.8" fill="#FFFFFF" />
        <rect
          x="4.3"
          y="5"
          width="15.4"
          height="14"
          rx="3.8"
          fill="none"
          stroke="#FF2442"
          strokeWidth="1.15"
        />
        <text
          x="12"
          y="11.9"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FF2442"
          fontSize="4.7"
          fontWeight="800"
          fontFamily="PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif"
          transform="rotate(-5 12 12)"
        >
          小红书
        </text>
        <rect
          x="7.1"
          y="14.3"
          width="9.8"
          height="1.15"
          rx="0.575"
          fill="#FF2442"
          transform="rotate(-5 12 12)"
        />
      </svg>
    );
  }

  if (variant === "xhs_original") {
    return (
      <svg {...iconProps}>
        <rect fill="#FF2442" width="24" height="24" rx="6" />
        <text
          x="12"
          y="15.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          fontSize="9"
          fontWeight="700"
          fontFamily="PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif"
          letterSpacing="0.5"
        >
          小红书
        </text>
      </svg>
    );
  }

  if (variant === "xhs_red") {
    return (
      <svg {...iconProps}>
        <rect fill="#FF2442" width="24" height="24" rx="6" />
        <text
          x="12"
          y="12.15"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#FFFFFF"
          fontSize="7.3"
          fontWeight="900"
          fontFamily="Arial Black,Helvetica Neue,Arial,sans-serif"
          fontStyle="italic"
          letterSpacing="-0.55"
          lengthAdjust="spacingAndGlyphs"
          textLength="13.5"
        >
          RED
        </text>
      </svg>
    );
  }

  if (variant === "xhs_shu") {
    return (
      <svg {...iconProps}>
        <rect fill="#FF2442" width="24" height="24" rx="6" />
        <text
          x="12"
          y="12.2"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#FFFFFF"
          fontSize="12.8"
          fontWeight="900"
          fontFamily="PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif"
          paintOrder="stroke"
          stroke="#E11D48"
          strokeWidth="0.5"
          strokeLinejoin="round"
        >
          书
        </text>
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <rect fill="#FF2442" width="24" height="24" rx="6" />
      <text
        x="12"
        y="12.2"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#FFFFFF"
        fontSize="10"
        fontWeight="800"
        fontFamily="PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif"
        letterSpacing="-0.25"
        lengthAdjust="spacingAndGlyphs"
        textLength="15.4"
        paintOrder="stroke"
        stroke="#E11D48"
        strokeWidth="0.45"
        strokeLinejoin="round"
      >
        小红书
      </text>
    </svg>
  );
}

function renderPlatformIcon(
  platform: Platform,
  size: number,
  variant: PlatformIconVariant
): ReactElement {
  const iconProps = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    xmlns: "http://www.w3.org/2000/svg",
    focusable: "false" as const,
  };

  switch (platform) {
    case "douyin":
      return (
        <svg {...iconProps}>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#111111" />
          <path
            fill="#25F4EE"
            transform="translate(2.55 1.95) scale(0.82)"
            d="M16.6 5.82s.47-2.82-1.72-4.82L12.72 3c1.75 1.73 1.66 4.28 1.66 4.28v8.44a4.06 4.06 0 0 1-2.17 3.59 4.04 4.04 0 0 1-5.5-1.59 4.05 4.05 0 0 1 1.49-5.53 4.03 4.03 0 0 1 4.04.14V9.4a7.35 7.35 0 0 0-3.28-.77A7.35 7.35 0 0 0 1.6 16a7.35 7.35 0 0 0 7.36 7.35 7.35 7.35 0 0 0 7.35-7.35V9.67a9.24 9.24 0 0 0 5.4 1.73V7.74a5.88 5.88 0 0 1-5.11-1.92z"
          />
          <path
            fill="#FE2C55"
            transform="translate(3.35 1.2) scale(0.82)"
            d="M16.6 5.82s.47-2.82-1.72-4.82L12.72 3c1.75 1.73 1.66 4.28 1.66 4.28v8.44a4.06 4.06 0 0 1-2.17 3.59 4.04 4.04 0 0 1-5.5-1.59 4.05 4.05 0 0 1 1.49-5.53 4.03 4.03 0 0 1 4.04.14V9.4a7.35 7.35 0 0 0-3.28-.77A7.35 7.35 0 0 0 1.6 16a7.35 7.35 0 0 0 7.36 7.35 7.35 7.35 0 0 0 7.35-7.35V9.67a9.24 9.24 0 0 0 5.4 1.73V7.74a5.88 5.88 0 0 1-5.11-1.92z"
          />
          <path
            fill="#FFFFFF"
            transform="translate(2.95 1.55) scale(0.82)"
            d="M16.6 5.82s.47-2.82-1.72-4.82L12.72 3c1.75 1.73 1.66 4.28 1.66 4.28v8.44a4.06 4.06 0 0 1-2.17 3.59 4.04 4.04 0 0 1-5.5-1.59 4.05 4.05 0 0 1 1.49-5.53 4.03 4.03 0 0 1 4.04.14V9.4a7.35 7.35 0 0 0-3.28-.77A7.35 7.35 0 0 0 1.6 16a7.35 7.35 0 0 0 7.36 7.35 7.35 7.35 0 0 0 7.35-7.35V9.67a9.24 9.24 0 0 0 5.4 1.73V7.74a5.88 5.88 0 0 1-5.11-1.92z"
          />
        </svg>
      );
    case "xiaohongshu":
      return renderXiaohongshuIcon(size, variant === "default" ? "xhs_badge" : variant);
    case "bilibili":
      return (
        <svg {...iconProps}>
          <path fill="#00A1D6" d="M5 7h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z" />
          <path fill="#00A1D6" d="M7 7L4.5 3h2.5l2.5 4H7zm8 0l2.5-4H20l-2.5 4h-2.5z" />
          <rect x="8" y="12" width="2.5" height="2" rx="0.5" fill="#fff" />
          <rect x="13.5" y="12" width="2.5" height="2" rx="0.5" fill="#fff" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...iconProps}>
          <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
          <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "weibo":
      return (
        <svg {...iconProps}>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#FFF4D6" />
          <path
            fill="#E6162D"
            d="M6.2 15.2c0-2.55 2.62-4.72 6.07-4.72 3.27 0 5.9 1.93 5.9 4.38 0 2.59-2.5 4.64-5.84 4.64-.92 0-1.78-.14-2.54-.4l-2.22.9.55-1.72c-1.22-.76-1.94-1.85-1.94-3.08z"
          />
          <ellipse cx="11.8" cy="15.1" rx="3.15" ry="2.02" fill="#FFFFFF" />
          <ellipse cx="11.9" cy="15.15" rx="1.12" ry="1.08" fill="#232323" />
          <circle cx="11.45" cy="14.7" r="0.28" fill="#FFFFFF" />
          <path
            d="M16.2 8.15c1.52-.1 2.72.42 3.36 1.44.52.82.52 1.94-.03 2.95"
            fill="none"
            stroke="#F6A000"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          <path
            d="M16.25 5.55c2.48-.23 4.56.72 5.53 2.41.82 1.41.8 3.11-.08 4.48"
            fill="none"
            stroke="#F6A000"
            strokeWidth="1.95"
            strokeLinecap="round"
          />
          <circle cx="15.25" cy="7.55" r="0.7" fill="#F6A000" />
        </svg>
      );
    case "wechat":
      return (
        <svg {...iconProps}>
          <path fill="#07C160" d="M8.5 5C4.9 5 2 7.5 2 10.5c0 1.7.9 3.2 2.3 4.2l-.6 2.3c-.1.3.2.5.5.4l2.7-1.3c.8.2 1.6.3 2.4.3.4 0 .7 0 1.1-.1-.3-.7-.4-1.4-.4-2.2 0-3.3 3-6 6.7-6 .4 0 .7 0 1.1.1C17 6.3 13.2 5 8.5 5z" />
          <circle cx="6.5" cy="10" r="0.8" fill="#fff" />
          <circle cx="10.5" cy="10" r="0.8" fill="#fff" />
          <path fill="#07C160" d="M16 10c-2.8 0-5 2-5 4.5s2.2 4.5 5 4.5c.6 0 1.2-.1 1.7-.3l1.8.9c.2.1.4-.1.3-.3l-.4-1.5c1-.8 1.6-2 1.6-3.3 0-2.5-2.2-4.5-5-4.5z" />
          <circle cx="14.5" cy="14" r="0.6" fill="#fff" />
          <circle cx="17.5" cy="14" r="0.6" fill="#fff" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#475569" />
          <path
            d="M8.1 15.9 6.7 17.3a2.55 2.55 0 0 1-3.6-3.6l2.45-2.45a2.55 2.55 0 0 1 3.6 0"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m15.9 8.1 1.4-1.4a2.55 2.55 0 1 1 3.6 3.6l-2.45 2.45a2.55 2.55 0 0 1-3.6 0"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m8.95 15.05 6.1-6.1"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export function PlatformIcon({
  platform,
  size = 16,
  variant = "default",
}: PlatformIconProps) {
  return (
    <span className="inline-flex shrink-0 align-middle leading-none" aria-hidden="true">
      {renderPlatformIcon(platform, size, variant)}
    </span>
  );
}
