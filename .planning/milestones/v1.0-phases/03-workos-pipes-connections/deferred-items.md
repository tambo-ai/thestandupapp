# Deferred Items - Phase 03

## ESLint Configuration Error After @radix-ui/themes Install

**Discovered during:** Plan 03-01, Task 1
**Description:** `npm run lint` fails with a ConfigValidator error from `@eslint/eslintrc` after installing `@radix-ui/themes`. The error appears to be caused by @radix-ui/themes including an eslintConfig in its package.json that is incompatible with the project's ESLint v9 flat config setup.
**Impact:** Lint command broken. Build and type checking still work fine.
**Recommendation:** Either upgrade eslint-config-next to a compatible version, or add an explicit eslintConfig override in the project's eslint.config.mjs to suppress the inherited config from @radix-ui/themes.
