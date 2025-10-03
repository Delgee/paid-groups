/**
 * ESLint Configuration for Telegram Groups SaaS Backend
 *
 * Note: API Response Naming Convention
 * =====================================
 * All API response DTOs and interfaces MUST use snake_case for property names.
 * This ensures consistency with:
 * - Database column naming (telegram_chat_id, bot_id, created_at)
 * - PostgreSQL conventions
 * - Other API response fields (connection_status, sync_enabled, bot_assigned)
 *
 * ⚠️ IMPORTANT - Pagination Fields:
 * Use: has_next_page, has_prev_page, total_pages
 * NOT: hasNext, hasPrev, totalPages
 *
 * This is enforced through:
 * 1. Code review process
 * 2. Contract tests that validate response schemas
 * 3. Shared PaginationDto in src/common/dto/pagination.dto.ts
 *
 * For automatic enforcement, use the calculatePagination() helper function.
 */

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/**/*', 'src/workers/**/*', 'eslint-rules/**/*'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};