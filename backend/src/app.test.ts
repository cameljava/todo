import { it } from 'node:test';
import assert from 'node:assert';
import { createTodoApp, TodoAdd, TodoList } from './app.js';
import { createInMemoryStore } from './store/inMemeoryStore.js';

it('lists todos', async () => {
  const todos: TodoList = [
    { id: '1', summary: 'test 1', done: false },
    { id: '2', summary: 'test 2', done: false },
  ];
  const todoApp = createTodoApp({ store: createInMemoryStore(todos) });
  const result = await todoApp.list();
  assert.deepEqual(result, todos);
});

it('adds a todo', async () => {
  const todoApp = createTodoApp({ store: createInMemoryStore() });
  const todoDetails: TodoAdd = {
    summary: 'test add',
    done: false,
  };
  const todo = await todoApp.add(todoDetails);
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

it('updates a todo', async () => {
  const todos: TodoList = [
    { id: '1', summary: 'test 1', done: false },
    { id: '2', summary: 'test 2', done: false },
  ];
  const todoApp = createTodoApp({ store: createInMemoryStore(todos) });
  await todoApp.update('2', { done: true });
  const updatedTodos = await todoApp.list();
  assert.deepEqual(updatedTodos, [
    { id: '1', summary: 'test 1', done: false },
    { id: '2', summary: 'test 2', done: true },
  ]);
});

it('throws when updating a todo that doesnt exist', async () => {
  const todoApp = createTodoApp({ store: createInMemoryStore() });
  await assert.rejects(async () => await todoApp.update('nope', { done: false }), /does not exist/);
});

it('removes a todo', async () => {
  const todos: TodoList = [
    { id: '1', summary: 'test 1', done: false },
    { id: '2', summary: 'test 2', done: false },
  ];
  const todoApp = createTodoApp({ store: createInMemoryStore(todos) });
  await todoApp.remove('2');
  const updatedTodos = await todoApp.list();
  assert.deepEqual(updatedTodos, [{ id: '1', summary: 'test 1', done: false }]);
});
