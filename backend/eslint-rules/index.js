/**
 * Custom ESLint rules for the Telegram Groups SaaS platform
 *
 * These rules enforce project-specific conventions and best practices.
 */

module.exports = {
  rules: {
    'enforce-snake-case-api-response': require('./enforce-snake-case-api-response'),
  },
};
