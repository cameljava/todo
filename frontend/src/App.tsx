import { useCallback, useEffect, useState } from 'react';
import './App.css';

type Todo = {
  id: string;
  summary: string;
  done: boolean;
};
type TodoDetails = Omit<Todo, 'id'>;

const todoApi = createTodoApi();

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const getTodos = useCallback(() => {
    console.log('Getting todos!');
    todoApi
      .list()
      .then(setTodos)
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    getTodos();
  }, [getTodos]);

  const addTodo = useCallback(
    (details: TodoDetails) => {
      todoApi
        .add(details)
        .then(() => getTodos())
        .catch((e) => console.error(e));
    },
    [getTodos]
  );

  const updateTodo = useCallback(
    (id: string, details: TodoDetails) => {
      todoApi
        .update(id, details)
        .then(() => getTodos())
        .catch((e) => console.error(e));
    },
    [getTodos]
  );

  const removeTodo = useCallback(
    (id: string) => {
      todoApi
        .remove(id)
        .then(() => getTodos())
        .catch((e) => console.error(e));
    },
    [getTodos]
  );

  return (
    <section>
      <h1>Todo App</h1>
      <AddTodoForm addTodo={addTodo} />
      <ol className="todo-list">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} removeTodo={removeTodo} updateTodo={updateTodo} />
        ))}
      </ol>
    </section>
  );
}

function AddTodoForm(props: { addTodo: (details: TodoDetails) => void }) {
  const { addTodo } = props;
  const [summary, setSummary] = useState('');

  const addHandler = useCallback(() => {
    addTodo({ summary, done: false });
    setSummary('');
  }, [addTodo, summary]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addHandler();
      }}
    >
      <div className="add-todo-container">
        <input name="summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <button type="submit">Add</button>
      </div>
    </form>
  );
}

function TodoItem(props: {
  todo: { id: string; summary: string; done: boolean };
  removeTodo: (id: string) => void;
  updateTodo: (id: string, details: TodoDetails) => void;
}) {
  const { todo, updateTodo, removeTodo } = props;
  const [summary, setSummary] = useState(todo.summary);
  const [done, setDone] = useState(todo.done);

  const triggerUpdate = useCallback(() => {
    updateTodo(todo.id, { summary, done });
  }, [done, summary, todo.id, updateTodo]);

  return (
    <li>
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => {
          setDone(e.target.checked);
          triggerUpdate();
        }}
      />
      <input
        name="summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        onBlur={() => triggerUpdate()}
      />
      <button type="button" onClick={() => removeTodo(todo.id)}>
        X
      </button>
    </li>
  );
}

function createTodoApi() {
  const baseUrl = import.meta.env.VITE_TODO_API_URL;
  if (!baseUrl) {
    throw new Error('VITE_TODO_API_URL must be set');
  }

  return {
    async list() {
      const res = await fetch(`${baseUrl}/`);
      const body = await res.json();
      if (!res.ok) {
        console.error(res.statusText, body);
      }
      return body as Todo[];
    },
    async add(details: TodoDetails) {
      const res = await fetch(`${baseUrl}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(details),
      });
      const body = await res.json();
      if (!res.ok) {
        console.error(res.statusText, body);
      }
      return body as Todo;
    },
    async update(id: string, details: TodoDetails) {
      const res = await fetch(`${baseUrl}/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(details),
      });
      const body = await res.json();
      if (!res.ok) {
        console.error(res.statusText, body);
      }
      return body as Todo;
    },
    async remove(id: string) {
      const res = await fetch(`${baseUrl}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        console.error(res.statusText);
      }
      return;
    },
  };
}

export default App;
