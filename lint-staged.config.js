export default {
  // Format all supported files
  '**/*': 'prettier --write --ignore-unknown',

  // Lint TypeScript and JavaScript files
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],

  // Special handling for component files
  '*.{ts,tsx}': ['prettier --write', () => 'echo "🎨 Formatted React/TypeScript files"'],

  // JSON and configuration files
  '*.{json,md,yml,yaml}': 'prettier --write',

  // Prevent committing to main/master directly
  '!(package-lock.json) package.json': [
    'prettier --write',
    () => 'echo "📦 Formatted package.json"',
  ],
}
