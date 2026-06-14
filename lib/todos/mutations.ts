import { createClient } from "@/app/lib/supabase/client";
import type {
  TodoInsert,
  TodoRecord,
  TodoUpdate,
} from "@/lib/todos/types";

/**
 * 添加待办。新待办的 sort_order 设为当前最大值 +1，使其排在最前。
 */
export async function addTodo(item: TodoInsert): Promise<TodoRecord> {
  const { data, error } = await createClient()
    .from("todos")
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data as TodoRecord;
}

/**
 * 更新待办
 */
export async function updateTodo(
  id: string,
  updates: TodoUpdate
): Promise<TodoRecord> {
  const { data, error } = await createClient()
    .from("todos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TodoRecord;
}

/**
 * 批量更新排序。拖拽结束后逐项更新 sort_order。
 */
export async function reorderTodos(
  updates: { id: string; sort_order: number }[]
): Promise<void> {
  const client = createClient();
  for (const update of updates) {
    const { error } = await client
      .from("todos")
      .update({ sort_order: update.sort_order })
      .eq("id", update.id);
    if (error) throw error;
  }
}

/**
 * 删除待办
 */
export async function deleteTodo(id: string) {
  const { error } = await createClient().from("todos").delete().eq("id", id);

  if (error) throw error;
}
