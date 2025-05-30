import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

// Simple debounce utility
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => void;
}

// Custom Error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: any,
    public responseHeaders: Headers
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Todo = {
  id: string;
  summary: string;
  done: boolean;
};
type TodoDetails = Omit<Todo, 'id'>;

function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const { getAccessToken } = useAuth();
  const todoApi = createTodoApi(getAccessToken);

  // Example: Add a state for user notifications
  const [notification, setNotification] = useState<string | null>(null);

  const handleApiError = useCallback((error: any) => {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        const retryAfter =
          error.responseHeaders.get('Retry-After') || error.body?.retryAfter || 'some time';
        const message =
          error.body?.message ||
          `You're doing that too fast! Please try again in ${retryAfter} seconds.`;
        setNotification(message);
        // Optionally, clear notification after some time
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification(`Error: ${error.message || 'An unknown error occurred.'}`);
        setTimeout(() => setNotification(null), 5000);
      }
    } else {
      setNotification('An unexpected error occurred.');
      setTimeout(() => setNotification(null), 5000);
    }
    console.error(error); // Keep logging for developers
  }, []);

  const getTodos = useCallback(() => {
    console.log('Getting todos!');
    todoApi.list().then(setTodos).catch(handleApiError);
  }, [todoApi, handleApiError]);

  useEffect(() => {
    getTodos();
  }, [getTodos]);

  const addTodo = useCallback(
    (details: TodoDetails) => {
      todoApi
        .add(details)
        .then(() => getTodos())
        .catch(handleApiError);
    },
    [getTodos, todoApi, handleApiError]
  );

  const updateTodo = useCallback(
    (id: string, details: TodoDetails) => {
      todoApi
        .update(id, details)
        .then(() => getTodos())
        .catch(handleApiError);
    },
    [getTodos, todoApi, handleApiError]
  );

  const removeTodo = useCallback(
    (id: string) => {
      todoApi
        .remove(id)
        .then(() => getTodos())
        .catch(handleApiError);
    },
    [getTodos, todoApi, handleApiError]
  );

  return (
    <section>
      {/* Example: Display notification */}
      {notification && (
        <div
          style={{
            padding: '1rem',
            margin: '1rem 0',
            backgroundColor: '#ffcccb',
            border: '1px solid red',
            borderRadius: '4px',
          }}
        >
          {notification}
        </div>
      )}
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
        <input
          name="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Enter a new todo..."
          style={{
            padding: '0.5rem',
            marginRight: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '16px',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Add
        </button>
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

  // Debounce the update function
  const debouncedUpdateTodo = useCallback(
    debounce((newDone: boolean, newSummary: string) => {
      updateTodo(todo.id, { summary: newSummary, done: newDone });
    }, 750), // 750ms debounce time
    [todo.id, updateTodo] // dependencies for useCallback
  );

  const handleDoneChange = (newDone: boolean) => {
    setDone(newDone);
    debouncedUpdateTodo(newDone, summary); // Pass current summary
  };

  const handleSummaryInputChange = (newSummary: string) => {
    setSummary(newSummary);
    debouncedUpdateTodo(done, newSummary); // Pass current done state
  };

  const handleSummaryBlur = () => {
    // Ensure the latest state is sent on blur, potentially flushing the debounce
    // Or, if the debounce interval is short enough, this might not be strictly needed
    // if onChange already covers it. For robustness:
    debouncedUpdateTodo(done, summary);
  };

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0',
        borderBottom: '1px solid #eee',
      }}
    >
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => {
          handleDoneChange(e.target.checked);
        }}
        style={{ marginRight: '0.5rem' }}
      />
      <input
        name="summary"
        value={summary}
        onChange={(e) => handleSummaryInputChange(e.target.value)}
        onBlur={handleSummaryBlur}
        style={{
          flex: 1,
          padding: '0.25rem',
          border: '1px solid #ddd',
          borderRadius: '4px',
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.6 : 1,
        }}
      />
      <button
        type="button"
        onClick={() => removeTodo(todo.id)}
        style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </li>
  );
}

function createTodoApi(getAccessToken: () => Promise<string | null>) {
  const baseUrl = import.meta.env.VITE_TODO_API_URL;
  if (!baseUrl) {
    throw new Error('VITE_TODO_API_URL must be set');
  }

  const getAuthHeaders = async () => {
    const token = await getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  // Helper to process fetch response
  const processResponse = async (res: Response, errorMessagePrefix: string) => {
    if (res.status === 204) {
      // Handle No Content responses (e.g., for DELETE)
      return;
    }

    const body = await res.json().catch(() => ({ message: 'Failed to parse error response' })); // Try to parse body

    if (!res.ok) {
      console.error(`${errorMessagePrefix} (${res.status}): ${res.statusText}`, body);
      // Include response headers in the ApiError
      throw new ApiError(
        `${errorMessagePrefix}: ${body.message || res.statusText}`,
        res.status,
        body,
        res.headers
      );
    }
    return body;
  };

  return {
    async list() {
      const headers = await getAuthHeaders();
      const res = await fetch(`${baseUrl}/`, {
        headers,
      });
      return (await processResponse(res, 'Failed to fetch todos')) as Todo[];
    },
    async add(details: TodoDetails) {
      const headers = await getAuthHeaders();
      const res = await fetch(`${baseUrl}/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(details),
      });
      return (await processResponse(res, 'Failed to add todo')) as Todo;
    },
    async update(id: string, details: TodoDetails) {
      const headers = await getAuthHeaders();
      const res = await fetch(`${baseUrl}/${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(details),
      });
      return (await processResponse(res, 'Failed to update todo')) as Todo;
    },
    async remove(id: string) {
      const headers = await getAuthHeaders();
      const res = await fetch(`${baseUrl}/${id}`, {
        method: 'DELETE',
        headers,
      });
      await processResponse(res, 'Failed to remove todo');
      return; // Explicitly return for void functions
    },
  };
}

export default TodoApp;
