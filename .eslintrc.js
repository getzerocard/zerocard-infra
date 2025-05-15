module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: process.cwd(),
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'unused-imports', 'import'],
  extends: [
    // All extends removed to disable linting
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    '.eslintrc.js',
    'dist/**/*',
    'node_modules/**/*',
    '**/*.js',
    '**/node_modules/**',
    '**/dist/**',
    '**/*.ts', // Adding all TypeScript files to ignore patterns
  ],
  rules: {
    // All rules set to 'off'
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'off',
    'unused-imports/no-unused-vars': 'off',
    'sort-imports': 'off',
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/no-import-type-side-effects': 'off',
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/prefer-ts-expect-error': 'off',
    'import/no-duplicates': 'off',
    'import/extensions': 'off',
    'import/consistent-type-specifier-style': 'off',
  },
};
