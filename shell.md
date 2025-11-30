When running Node.js commands on macOS with zsh, make sure to check these things to avoid errors:

1. Shell environment:
   - Avoid using `-lc` unless necessary, because Homebrew’s shellenv may call `ps` which is blocked by macOS SIP.
   - If you see `/bin/ps: Operation not permitted`, it’s usually harmless, but you can drop `-lc`.

2. File types:
   - Node.js cannot run `.ts` files directly with `require()`. Always check if the file is TypeScript.
   - If it’s `.ts`, either:
     a) Compile with `tsc` first and run the `.js` output, or
     b) Use `ts-node` with `import` syntax.

3. Module system:
   - Confirm if the project uses CommonJS (`require`) or ESM (`import`).
   - If `"type": "module"` is in `package.json`, you must use `import` instead of `require`.

4. Correct paths:
   - Ensure the path points to the compiled `.js` file, not the `.ts` source, unless using `ts-node`.

Before running commands, always verify:
- Shell flags don’t trigger SIP restrictions
- File extension matches what Node can execute
- Module system (CommonJS vs ESM) is consistent
- Dependencies like `ts-node` are installed if you want to run TypeScript directly
