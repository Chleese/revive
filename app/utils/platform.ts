/**
 * 平台类型定义
 */
export type Platform =
  | "douyin"
  | "xiaohongshu"
  | "bilibili"
  | "youtube"
  | "weibo"
  | "wechat"
  | "other";

/**
 * 平台识别规则
 */
const PLATFORM_RULES: Record<Platform, RegExp[]> = {
  douyin: [/douyin\.com/i],
  xiaohongshu: [/xiaohongshu\.com/i, /xhslink\.com/i],
  bilibili: [/bilibili\.com/i, /b23\.tv/i],
  youtube: [/youtube\.com/i, /youtu\.be/i],
  weibo: [/weibo\.com/i, /weibo\.cn/i],
  wechat: [/mp\.weixin\.qq\.com/i],
  other: [],
};

/**
 * 平台显示名称
 */
export const PLATFORM_NAMES: Record<Platform, string> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  bilibili: "B站",
  youtube: "YouTube",
  weibo: "微博",
  wechat: "公众号",
  other: "其他",
};

/**
 * 根据 URL 识别平台
 * @param url - 要识别的 URL
 * @returns 平台类型
 */
export function detectPlatform(url: string): Platform {
  const lowerUrl = url.toLowerCase();

  for (const [platform, patterns] of Object.entries(PLATFORM_RULES)) {
    if (platform === "other") continue;
    for (const pattern of patterns) {
      if (pattern.test(lowerUrl)) {
        return platform as Platform;
      }
    }
  }

  return "other";
}

/**
 * 获取平台显示名称
 * @param platform - 平台类型
 * @returns 平台显示名称
 */
export function getPlatformName(platform: Platform): string {
  return PLATFORM_NAMES[platform];
}
