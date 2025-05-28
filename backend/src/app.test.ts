import { it } from 'node:test';
import assert from 'node:assert';
import { createTodoApp, TodoAdd, TodoList } from './app.js';
import { createInMemoryStore } from './store/inMemeoryStore.js';

it('lists todos', () => {
  const todos: TodoList = [
    { id: '1', summary: 'test 1', done: false },
    { id: '2', summary: 'test 2', done: false },
  ];
  const todoApp = createTodoApp({ store: createInMemoryStore(todos) });
  assert.deepEqual(todoApp.list(), todos);
});

it('adds a todo', () => {
  const todoApp = createTodoApp({ store: createInMemoryStore() });
  const todoDetails: TodoAdd = {
    summary: 'test add',
    done: false,
  };
  const todo = todoApp.add(todoDetails);
  assert(typeof todo.id === 'string');
  assert.deepEqual(
    {
      ...todo,
      id: 'test',
    },
    {
      ...todoDetails,
      id: 'test',
    }
  );
});

it('updates a todo', () => {
  const todos: TodoList = [
    { id: '1', summary: 'test 1', done: false },
    { id: '2', summary: 'test 2', done: false },
  ];
  const todoApp = createTodoApp({ store: createInMemoryStore(todos) });
  todoApp.update('2', { done: true });
  const updatedTodos = todoApp.list();
  assert.deepEqual(updatedTodos, [
    { id: '1', summary: 'test 1', done: false },
    { id: '2', summary: 'test 2', done: true },
  ]);
});

it('throws when updating a todo that doesnt exist', () => {
  const todoApp = createTodoApp({ store: createInMemoryStore() });
  assert.throws(() => todoApp.update('nope', { done: false }), /does not exist/);
});

it('removes a todo', () => {
  const todos: TodoList = [
    { id: '1', summary: 'test 1', done: false },
    { id: '2', summary: 'test 2', done: false },
  ];
  const todoApp = createTodoApp({ store: createInMemoryStore(todos) });
  todoApp.remove('2');
  const updatedTodos = todoApp.list();
  assert.deepEqual(updatedTodos, [{ id: '1', summary: 'test 1', done: false }]);
});
