export async function readJsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "请求失败，请稍后重试。");
  }

  return payload as T;
}

export function isNoRowsError(error: { code?: string } | null) {
  return error?.code === "PGRST116";
}
