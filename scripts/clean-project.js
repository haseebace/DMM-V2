#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🧹 Cleaning project...')

// Clean common build artifacts
const cleanDirs = ['.next', 'dist', 'build', 'coverage', 'node_modules/.cache']

const cleanFiles = ['.DS_Store', 'Thumbs.db', '*.log', '.env.local']

for (const dir of cleanDirs) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
    console.log(`Removed directory: ${dir}`)
  }
}

console.log('✅ Project cleaned!')
console.log('Run "npm install" to reinstall dependencies.')
