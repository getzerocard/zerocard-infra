---
description: 
globs: 
alwaysApply: true
---

# Your writing style you must follow 

These are the coding standards we follow. Stick to them so your code stays clean and doesn’t break linting.

---

## 🧠 TypeScript Practices

- ✅ Use TypeScript files only (`.ts`, `.tsx`).  
- ❌ Avoid using JavaScript files (`.js`, `.jsx`).

- ✅ Use `interface` for defining object shapes.  
- ❌ Avoid using `type` for objects unless absolutely necessary.

- ✅ You can use `any` if needed, but only when it makes sense.  
- ❌ Don’t overuse `any` — try to be specific when you can.

- ✅ Return types for functions are optional.  
- ❌ Don’t feel forced to declare return types everywhere.

- ✅ You can skip defining module boundary return types.  
- ❌ Don’t waste time typing everything at the edge of modules.

- ✅ Use `import type` when importing types.  
- ❌ Don’t use regular `import` for types if you’re not using the value at runtime.

- ✅ Use `// @ts-expect-error` if you need to suppress TypeScript errors.  
- ❌ Don’t use `// @ts-ignore` — it’s more dangerous and less descriptive.

---

## 🧼 Unused Code

- ✅ Remove all unused imports.  
- ❌ Don’t leave unused imports hanging around — they’ll throw an error.

- ✅ Remove unused variables, or prefix them with `_` if you need to keep them for future use.  
- ❌ Don’t leave unused variables unless they’re clearly marked as ignored.

- ✅ It’s okay to use rest objects like `{ a, ...rest }` — we allow that.  
- ❌ Don’t keep unused variables without a reason.

---

## 📦 Import Organization

- ✅ Group and clean up your imports.  
- ✅ Sort imports by type:  
  - Side-effect imports  
  - Namespace imports  
  - Multiple member imports  
  - Single member imports  
- ✅ Use separated groups for clarity.

- ❌ Don’t mix up system, package, and internal imports in one block.

---

## 🔍 Testing Environment

- ✅ Jest is already configured, so you can use `describe`, `test`, and `expect` without extra setup.

---

## 🚫 Avoid This

- ❌ Don’t use `console.log` in production code. Use proper logging or monitoring instead.
- ❌ Don’t override ESLint rules unless it’s discussed and approved.
- ❌ Don’t commit code with lint errors or unused code.

---

## 💡 Pro Tips

- ✅ Run `eslint . --fix` before every commit.
- ✅ Use `// eslint-disable-next-line` only when absolutely needed — and always leave a comment explaining why.
- ✅ Keep your code clean and consistent with this guide.

---

Stick to these rules and we’re good. Code smart, write clean.