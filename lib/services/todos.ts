import {
  addTodo,
  deleteTodo,
  reorderTodos,
  updateTodo,
} from "@/lib/todos/mutations";
import { getUserTodos } from "@/lib/todos/queries";
import type {
  TodoInsert,
  TodoRecord,
  TodoUpdate,
} from "@/lib/todos/types";

export const todoService = {
  listUserTodos(userId: string): Promise<TodoRecord[]> {
    return getUserTodos(userId);
  },

  create(item: TodoInsert): Promise<TodoRecord> {
    return addTodo(item);
  },

  update(id: string, updates: TodoUpdate): Promise<TodoRecord> {
    return updateTodo(id, updates);
  },

  reorder(updates: { id: string; sort_order: number }[]): Promise<void> {
    return reorderTodos(updates);
  },

  remove(id: string) {
    return deleteTodo(id);
  },
};
