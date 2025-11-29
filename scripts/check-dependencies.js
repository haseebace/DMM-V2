#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔍 Checking development dependencies...')

// Check if required files exist
const requiredFiles = [
  'package.json',
  'next.config.ts',
  'tsconfig.json',
  'tailwind.config.js',
  'components.json',
  '.prettierrc',
  'eslint.config.mjs',
  'vitest.config.ts',
]

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing required file: ${file}`)
    process.exit(1)
  }
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...')
  execSync('npm install', { stdio: 'inherit' })
}

// Check if git hooks are installed
if (!fs.existsSync('.husky/pre-commit')) {
  console.log('🪝 Installing Git hooks...')
  execSync('npm run prepare', { stdio: 'inherit' })
}

console.log('✅ Development environment is ready!')
