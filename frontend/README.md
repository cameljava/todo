# Todo Frontend Application

A modern React-based Todo application with AWS Cognito authentication, featuring a responsive UI and seamless user experience.

## Description

- **Framework**: React 19 with TypeScript and Vite for fast development
- **Authentication**: AWS Amplify UI with Cognito integration
- **Styling**: Modern CSS with responsive design
- **State Management**: React Context API with custom hooks
- **Build Tool**: Vite with optimized production builds
- **Social Login**: Google, Facebook, and email/password authentication

## Project Structure

```
frontend/
├── src/
│   ├── components/           # React components
│   │   ├── AuthenticatedApp.tsx  # Main app with user header
│   │   └── TodoApp.tsx          # Todo functionality
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx      # Authentication context
│   │   └── AuthContextProvider.ts
│   ├── hooks/               # Custom React hooks
│   │   └── useAuth.ts          # Authentication hook
│   ├── types/               # TypeScript definitions
│   │   └── auth.ts            # Auth type definitions
│   ├── aws-config.ts        # AWS Amplify configuration
│   ├── App.tsx              # Root component with Authenticator
│   ├── App.css              # Application styles
│   └── main.tsx             # Application entry point
├── dist/                    # Build output
├── index.html               # HTML template
├── vite.config.ts          # Vite configuration
└── package.json
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- AWS Cognito User Pool configured
- Backend API running (for full functionality)

### Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp env.example .env.local

# Edit environment variables
vim .env.local
```

### Environment Variables

```bash
# Required for authentication
VITE_COGNITO_USER_POOL_ID=ap-southeast-2_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_DOMAIN=your-app-domain
VITE_REDIRECT_SIGN_IN=http://localhost:5173
VITE_REDIRECT_SIGN_OUT=http://localhost:5173

# Backend API configuration
VITE_API_URL=http://localhost:3000

# Optional: Social login providers
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_FACEBOOK_APP_ID=your-facebook-app-id
```

## Run

### Development Mode

```bash
# Start development server with hot reload
npm run dev

# Access application
open http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Serve static files (dist folder can be deployed to S3)
```

### Development Features

- **Hot Module Replacement**: Instant updates during development
- **Fast Refresh**: React components update without losing state
- **TypeScript**: Full type checking in development
- **Source Maps**: Debugging support in browser

## Test

### Code Quality

```bash
# Lint code
npm run lint

# Format code (automatic with Prettier)
npm run format

# Type checking
npx tsc --noEmit
```

### Manual Testing

```bash
# Test authentication flow
1. Visit http://localhost:5173
2. Click "Sign In"
3. Try different auth methods (email, Google, Facebook)
4. Verify user session persistence
5. Test sign out

# Test todo functionality
1. Create new todos
2. Mark todos as complete/incomplete
3. Delete todos
4. Verify data persistence
```

### Integration Testing

```bash
# Test with backend API
# Ensure backend is running on localhost:3000
npm run dev

# Test authentication integration
curl -H "Authorization: Bearer <jwt-from-browser>" \
     http://localhost:3000/
```

## Features

### Authentication

- **AWS Cognito Integration**: Secure authentication with JWT tokens
- **Social Login**: Google and Facebook OAuth
- **User Session**: Persistent login with automatic token refresh
- **Sign Up/Sign In**: Email verification and password reset

### Todo Management

- **Create Todos**: Add new todo items with text input
- **Toggle Completion**: Mark todos as done/undone with checkbox
- **Delete Todos**: Remove unwanted todo items
- **User Isolation**: Each user sees only their own todos

### User Experience

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Loading States**: Visual feedback during API calls
- **Error Handling**: User-friendly error messages
- **Accessible**: Keyboard navigation and screen reader support

## Components Architecture

### Core Components

```typescript
// Main application wrapper
<AuthenticatedApp>
  <UserHeader />        // User info and sign-out
  <TodoApp />          // Todo functionality
</AuthenticatedApp>

// Authentication wrapper
<Authenticator>
  <AuthenticatedApp />  // Shown when authenticated
</Authenticator>
```

### State Management

```typescript
// Authentication context
const { user, signOut, isAuthenticated } = useAuth();

// Todo state (local component state)
const [todos, setTodos] = useState([]);
const [loading, setLoading] = useState(false);
```

## Configuration

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### AWS Amplify Setup

```typescript
// aws-config.ts
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [import.meta.env.VITE_REDIRECT_SIGN_IN],
          redirectSignOut: [import.meta.env.VITE_REDIRECT_SIGN_OUT],
          responseType: 'code',
        },
      },
    },
  },
});
```

## Deployment

### S3 Static Website

```bash
# Build for production
npm run build

# Deploy to S3 (using AWS CLI)
aws s3 sync dist/ s3://your-bucket-name --delete

# Or deploy via CDK/CloudFormation
# See infrastructure/README.md for automated deployment
```

### CloudFront CDN

The application is designed to work with CloudFront for:

- Global content delivery
- HTTPS termination
- Caching optimization
- WAF protection

## Troubleshooting

### Common Issues

**Authentication Not Working**:

```bash
# Check environment variables
echo $VITE_COGNITO_USER_POOL_ID
echo $VITE_COGNITO_CLIENT_ID

# Verify Cognito domain configuration
curl https://your-cognito-domain.auth.region.amazoncognito.com/.well-known/openid_configuration
```

**API Connection Failed**:

```bash
# Check backend is running
curl http://localhost:3000/health

# Verify CORS configuration in backend
# Check browser network tab for CORS errors
```

**Build Issues**:

```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npx tsc --noEmit
```

**Social Login Not Working**:

```bash
# Verify social provider configuration in Cognito
# Check redirect URLs match environment variables
# Ensure social provider apps are configured correctly
```

## Development Workflow

### Code Standards

- **TypeScript**: All components use TypeScript
- **ESLint**: Automatic code quality checking
- **Prettier**: Consistent code formatting
- **Git Hooks**: Pre-commit quality checks

### Component Development

```typescript
// Example component structure
export function TodoApp() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);

  // Component logic...

  return (
    <div className="todo-app">
      {/* Component JSX */}
    </div>
  );
}
```

## Documentation

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [AWS Cognito Setup Guide](../docs/authentication-setup.md)
