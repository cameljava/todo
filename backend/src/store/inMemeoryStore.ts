import type { Todo, TodoStore } from '../app.js';

export function createInMemoryStore(todos?: Todo[]): TodoStore {
  const map = new Map(todos?.map((todo) => [todo.id, todo]));

  return {
    async delete(id: string, _userId?: string): Promise<void> {
      map.delete(id);
    },
    async get(id: string, _userId?: string): Promise<Todo | undefined> {
      return map.get(id);
    },
    async set(id: string, todo: Todo, _userId?: string): Promise<void> {
      map.set(id, todo);
    },
    async list(_userId?: string): Promise<Todo[]> {
      return Array.from(map.values());
    },
  };
}
