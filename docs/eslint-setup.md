# ESLint Configuration

This project uses separate ESLint configurations for frontend, backend, and infrastructure to provide tailored linting rules for each environment.

## Structure

```
├── frontend/
│   ├── eslint.config.js    # React/Frontend-specific ESLint config
│   └── package.json        # Frontend ESLint dependencies
├── backend/
│   ├── eslint.config.js    # Node.js/Backend-specific ESLint config
│   └── package.json        # Backend ESLint dependencies
├── infrastructure/
│   ├── eslint.config.js    # AWS CDK/Infrastructure-specific ESLint config
│   └── package.json        # Infrastructure ESLint dependencies
├── .prettierrc             # Shared Prettier configuration (used by all projects)
└── package.json            # Root workspace config (no ESLint deps)
```

## Frontend Configuration

**Location:** `frontend/eslint.config.js`

**Features:**

- React-specific rules (`react-hooks`, `react-refresh`)
- TypeScript support
- Prettier integration
- JSX support
- Browser globals (`console`, `fetch`, `document`)

**Key Rules:**

- `react-hooks/rules-of-hooks`: Enforces React Hooks rules
- `react-hooks/exhaustive-deps`: Warns about missing dependencies
- `react-refresh/only-export-components`: Ensures proper React Fast Refresh
- `no-console`: Warns about console usage (allows warn/error)

## Backend Configuration

**Location:** `backend/eslint.config.js`

**Features:**

- Node.js-specific rules
- TypeScript support
- Prettier integration
- Server-side best practices
- Node.js globals

**Key Rules:**

- `no-console`: Warns about console usage (allows warn/error)
- `no-process-exit`: Prevents direct process.exit() calls
- `no-path-concat`: Prevents string concatenation for paths
- `prefer-const`: Enforces const for non-reassigned variables

## Infrastructure Configuration

**Location:** `infrastructure/eslint.config.js`

**Features:**

- AWS CDK-specific rules
- TypeScript support with type checking
- Prettier integration
- Node.js globals
- Separate rules for JavaScript scripts

**Key Rules:**

- `no-console`: Warns about console usage (allows warn/error/info)
- `no-process-exit`: Prevents direct process.exit() calls
- `@typescript-eslint/no-unused-vars`: Handles unused variables (ignores `_` prefixed)
- Scripts in `scripts/` directory allow console usage

## Prettier Configuration

**Location:** `.prettierrc` (root level, shared by all projects)

**Configuration:**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

**Why Shared?**

- Ensures consistent formatting across all projects
- Prettier automatically finds the closest configuration file
- No need for duplicate configs unless projects need different formatting
- Simplifies maintenance

## Usage

### Lint Individual Projects

```bash
# Frontend only
cd frontend && npm run lint

# Backend only
cd backend && npm run lint

# Infrastructure only
cd infrastructure && npm run lint
```

### Lint All Projects (from root)

```bash
npm run lint
```

### Auto-fix Issues

```bash
# Frontend
cd frontend && npm run lint -- --fix

# Backend
cd backend && npm run lint -- --fix

# Infrastructure
cd infrastructure && npm run lint -- --fix
```

## Dependencies

Each project manages its own ESLint dependencies:

### Frontend Dependencies

- `@eslint/js`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `eslint`
- `eslint-plugin-prettier`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `globals`
- `prettier`

### Backend Dependencies

- `@eslint/js`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `eslint`
- `eslint-plugin-prettier`
- `globals`
- `prettier`

### Infrastructure Dependencies

- `@eslint/js`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `eslint`
- `eslint-plugin-prettier`
- `globals`
- `prettier`

## Benefits of Separate Configs

1. **Environment-specific rules**: React rules only apply to frontend, Node.js rules only to backend, CDK rules to infrastructure
2. **Cleaner dependencies**: Each project only includes what it needs
3. **Independent configuration**: Changes to one config don't affect the others
4. **Better performance**: Smaller rule sets for each environment
5. **Easier maintenance**: Clear separation of concerns
6. **Tailored globals**: Browser globals for frontend, Node.js globals for backend/infrastructure

## Git Hooks

The project uses `lint-staged` to run ESLint on changed files before commit:

```json
{
  "lint-staged": {
    "frontend/**/*.{js,jsx,ts,tsx}": [
      "cd frontend && npm run lint -- --fix",
      "cd frontend && npx prettier --write"
    ],
    "backend/**/*.{js,ts}": [
      "cd backend && npm run lint -- --fix",
      "cd backend && npx prettier --write"
    ],
    "infrastructure/**/*.{js,ts}": [
      "cd infrastructure && npm run lint -- --fix",
      "cd infrastructure && npx prettier --write"
    ]
  }
}
```

This ensures code quality and consistent formatting across all three projects.

## Common Issues and Solutions

### 1. `no-unused-vars` conflicts

**Problem:** Base ESLint `no-unused-vars` conflicts with TypeScript version
**Solution:** Disable base rule: `'no-unused-vars': 'off'` and use `@typescript-eslint/no-unused-vars`

### 2. Missing globals

**Problem:** `console`, `fetch`, `document` undefined errors
**Solution:** Add appropriate globals (`globals.browser` for frontend, `globals.node` for backend/infrastructure)

### 3. TypeScript project configuration

**Problem:** Rules requiring type information fail
**Solution:** Add `project: true` and `tsconfigRootDir: import.meta.dirname` to parser options

### 4. Prettier formatting conflicts

**Problem:** Different formatting rules between projects
**Solution:** Use shared `.prettierrc` in root directory
