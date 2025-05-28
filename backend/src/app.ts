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
  list: () => TodoList;
  add: (todo: TodoAdd) => Todo;
  update: (id: TodoId, update: TodoUpdate) => Todo;
  remove: (id: TodoId) => void;
};

export type TodoStore = {
  set: (id: string, todo: Todo) => void;
  get: (id: string) => Todo | undefined;
  list: () => Todo[];
  delete: (id: string) => void;
};

type CreateTodoAppOpts = {
  store: TodoStore;
};

export function createTodoApp(opts: CreateTodoAppOpts): TodoApp {
  const { store } = opts;

  return {
    list() {
      return store.list();
    },
    add(todoDetails) {
      const todo = {
        id: generateTodoId(),
        ...todoDetails,
      };
      store.set(todo.id, todo);
      return todo;
    },
    update(id, updateDetails) {
      const existingTodo = store.get(id);
      if (!existingTodo) {
        throw new ClientError(`Todo with id '${id}' does not exist`);
      }
      const updatedTodo = {
        ...existingTodo,
        ...updateDetails,
      };
      store.set(id, updatedTodo);
      return updatedTodo;
    },
    remove(id) {
      store.delete(id);
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
