# Contributing to DFM

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in values
4. Install Git hooks: `npm run prepare`
5. Start development: `npm run dev`

## Code Quality Standards

### Formatting

- Uses Prettier with Tailwind CSS plugin
- Automatic formatting on pre-commit
- Run manually: `npm run format`

### Linting

- ESLint with Next.js and TypeScript rules
- Runs on pre-commit and pre-push
- Fix manually: `npm run lint:fix`

### Testing

- Vitest for unit testing
- Run tests: `npm run test`
- Test coverage: `npm run test:coverage`
- UI mode: `npm run test:ui`

### Type Safety

- Strict TypeScript configuration
- Type checking: `npm run type-check`
- All new code must pass type checks

## Git Workflow

1. Create feature branch from main
2. Make changes with frequent commits
3. Ensure all checks pass:
   - `npm run check-all`
4. Push branch and create PR
5. Code review and merge

## Pre-commit Checks

- Code formatting with Prettier
- Linting with ESLint
- TypeScript type checking
- Basic test run (when tests exist)

## Pre-push Checks

- Complete test suite
- Build verification
