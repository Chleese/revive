const ADJECTIVES = [
  "拾光", "寻星", "追风", "听雨", "知秋",
  "望月", "逐梦", "漫游", "漫步", "探索",
  "贪玩", "慢热", "随性", "独处", "微醺",
  "清醒", "温柔", "热烈", "安静", "从容",
] as const;

const NOUNS = [
  "旅人", "观察者", "收集者", "冒险家", "发现者",
  "行者", "猎人", "猫", "鲸", "鹿",
  "萤火虫", "信使", "守夜人", "筑巢者", "航海家",
  "拾荒者", "园丁", "旅鸽", "信天翁", "淘金者",
] as const;

function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function generateDefaultName(userId: string): string {
  const hash = simpleHash(userId);
  const adjective = ADJECTIVES[hash % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(hash / ADJECTIVES.length) % NOUNS.length];
  return `${adjective}的${noun}`;
}
