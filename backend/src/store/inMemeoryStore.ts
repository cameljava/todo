import type { TodoList, TodoStore } from '../app.js';

export function createInMemoryStore(todos?: TodoList): TodoStore {
  const map = new Map(todos?.map((todo) => [todo.id, todo]));

  return {
    delete: (id: string) => map.delete(id),
    get: (id: string) => map.get(id),
    set: (id: string, todo) => map.set(id, todo),
    list() {
      return Array.from(map.values());
    },
  };
}
