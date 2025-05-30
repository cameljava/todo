import { randomUUID } from 'node:crypto';

export type TodoId = string;
export type Todo = {
  id: TodoId;
  summary: string;
  done: boolean;
};
export type TodoList = Todo[];
export type TodoAdd = Omit<Todo, 'id'>;
export type TodoUpdate = Partial<TodoAdd>;

export type TodoApp = {
  list: (userId?: string) => Promise<TodoList>;
  add: (todo: TodoAdd, userId?: string) => Promise<Todo>;
  update: (id: TodoId, update: TodoUpdate, userId?: string) => Promise<Todo>;
  remove: (id: TodoId, userId?: string) => Promise<void>;
};

export type TodoStore = {
  set: (id: string, todo: Todo, userId?: string) => Promise<void>;
  get: (id: string, userId?: string) => Promise<Todo | undefined>;
  list: (userId?: string) => Promise<Todo[]>;
  delete: (id: string, userId?: string) => Promise<void>;
};

type CreateTodoAppOpts = {
  store: TodoStore;
};

export function createTodoApp(opts: CreateTodoAppOpts): TodoApp {
  const { store } = opts;

  return {
    async list(userId?: string) {
      return await store.list(userId);
    },
    async add(todoDetails, userId?: string) {
      const todo = {
        id: generateTodoId(),
        ...todoDetails,
      };
      await store.set(todo.id, todo, userId);
      return todo;
    },
    async update(id, updateDetails, userId?: string) {
      const existingTodo = await store.get(id, userId);
      if (!existingTodo) {
        throw new ClientError(`Todo with id '${id}' does not exist`);
      }
      const updatedTodo = {
        ...existingTodo,
        ...updateDetails,
      };
      await store.set(id, updatedTodo, userId);
      return updatedTodo;
    },
    async remove(id, userId?: string) {
      await store.delete(id, userId);
      return;
    },
  };
}

export class ClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClientError';
  }
}

function generateTodoId() {
  return randomUUID();
}
