import { createClient } from "@/app/lib/supabase/client";
import type { TodoRecord } from "@/lib/todos/types";

/**
 * 获取用户的所有待办，按状态分组 + 手动排序。
 * 返回原始记录，分组排序逻辑由 UI 层（display.sortTodosForView）处理。
 */
export async function getUserTodos(userId: string): Promise<TodoRecord[]> {
  const { data, error } = await createClient()
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TodoRecord[];
}
