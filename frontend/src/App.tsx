import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsConfig from './aws-config';
import { AuthProvider } from './contexts/AuthContext';
import AuthenticatedApp from './components/AuthenticatedApp';
import './App.css';

// Configure Amplify
Amplify.configure(awsConfig);

function App() {
  return (
    <Authenticator
      loginMechanisms={['email']}
      signUpAttributes={['email']}
      socialProviders={['google', 'facebook']}
      components={{
        Header() {
          return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <h1>Todo App</h1>
              <p>Sign in to manage your todos</p>
            </div>
          );
        },
      }}
    >
      {({ user }) =>
        user ? (
          <AuthProvider>
            <AuthenticatedApp />
          </AuthProvider>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Please sign in to continue</p>
          </div>
        )
      }
    </Authenticator>
  );
}

export default App;
