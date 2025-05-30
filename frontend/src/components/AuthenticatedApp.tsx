import React from 'react';
import { useAuth } from '../hooks/useAuth';
import TodoApp from './TodoApp.tsx';

const AuthenticatedApp: React.FC = () => {
  const { user, signOut, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <header
        style={{
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1>Todo App</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Welcome, {user?.username || user?.email}!</span>
          <button
            onClick={signOut}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>
      <main style={{ padding: '1rem' }}>
        <TodoApp />
      </main>
    </div>
  );
};

export default AuthenticatedApp;
