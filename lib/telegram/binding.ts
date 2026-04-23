import { createHmac, timingSafeEqual } from "node:crypto";

const TELEGRAM_BINDING_TTL_MS = 15 * 60 * 1000;
const TOKEN_SIGNATURE_LENGTH = 22;
const COMPACT_USER_ID_LENGTH = 32;
const EXP_LENGTH = 8;

function getBindingSecret() {
  const secret = process.env.TELEGRAM_BINDING_SECRET;

  if (!secret) {
    throw new Error("TELEGRAM_BINDING_SECRET is not configured.");
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getBindingSecret())
    .update(payload)
    .digest("base64url")
    .slice(0, TOKEN_SIGNATURE_LENGTH);
}

function normalizeUserId(userId: string) {
  return userId.replace(/-/g, "");
}

function restoreUserId(compactUserId: string) {
  if (!/^[0-9a-f]{32}$/i.test(compactUserId)) {
    return null;
  }

  return compactUserId.replace(
    /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
    "$1-$2-$3-$4-$5",
  );
}

export function createTelegramBindingToken(userId: string) {
  const expiresAt = new Date(Date.now() + TELEGRAM_BINDING_TTL_MS);
  const compactUserId = normalizeUserId(userId);
  const exp = Math.floor(expiresAt.getTime() / 1000)
    .toString(36)
    .padStart(EXP_LENGTH, "0");
  const payload = `${compactUserId}${exp}`;
  const signature = signPayload(payload);

  return {
    token: `${payload}${signature}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export function verifyTelegramBindingToken(token: string) {
  const expectedLength =
    COMPACT_USER_ID_LENGTH + EXP_LENGTH + TOKEN_SIGNATURE_LENGTH;
  if (token.length !== expectedLength) {
    return {
      ok: false as const,
      reason: "绑定口令已经失效，请回到 Revive 重新发起绑定。",
    };
  }

  const payload = token.slice(
    0,
    COMPACT_USER_ID_LENGTH + EXP_LENGTH,
  );
  const signature = token.slice(COMPACT_USER_ID_LENGTH + EXP_LENGTH);

  if (!payload || !signature) {
    return {
      ok: false as const,
      reason: "绑定口令已经失效，请回到 Revive 重新发起绑定。",
    };
  }

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return {
      ok: false as const,
      reason: "绑定口令已经失效，请回到 Revive 重新发起绑定。",
    };
  }

  try {
    const compactUserId = payload.slice(0, COMPACT_USER_ID_LENGTH);
    const expValue = payload.slice(COMPACT_USER_ID_LENGTH);
    const userId = compactUserId ? restoreUserId(compactUserId) : null;
    const exp = expValue ? parseInt(expValue, 36) : NaN;

    if (!userId || Number.isNaN(exp)) {
      return {
        ok: false as const,
        reason: "绑定口令已经失效，请回到 Revive 重新发起绑定。",
      };
    }

    if (exp * 1000 <= Date.now()) {
      return {
        ok: false as const,
        reason: "绑定已过期，请回到 Revive 重新点击绑定 Telegram。",
      };
    }

    return {
      ok: true as const,
      userId,
    };
  } catch {
    return {
      ok: false as const,
      reason: "绑定口令已经失效，请回到 Revive 重新发起绑定。",
    };
  }
}
