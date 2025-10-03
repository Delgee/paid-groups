/**
 * ESLint custom rule: enforce-snake-case-api-response
 *
 * Enforces snake_case naming convention for API response DTOs and interfaces.
 * This ensures consistency across all API responses.
 *
 * Rule will check:
 * 1. Class properties in files ending with .dto.ts
 * 2. Interface properties in files containing 'Response' in the name
 * 3. Return object properties from service methods that return API responses
 *
 * Exceptions:
 * - camelCase is allowed for internal logic
 * - Properties explicitly marked with @ApiProperty or @ApiPropertyOptional must use snake_case
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce snake_case naming for API response properties',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      snakeCaseRequired: 'API response property "{{ propertyName }}" should use snake_case. Consider renaming to "{{ suggestion }}".',
      paginationFieldRequired: 'Pagination field "{{ propertyName }}" should be "{{ correctName }}". Use snake_case: has_next_page, has_prev_page, total_pages.',
    },
    schema: [],
    fixable: 'code',
  },

  create(context) {
    const filename = context.getFilename();
    const isDtoFile = filename.endsWith('.dto.ts');
    const isResponseInterface = filename.includes('Response') || filename.includes('response');

    // Skip if not a DTO or Response file
    if (!isDtoFile && !isResponseInterface) {
      return {};
    }

    /**
     * Check if a property name is in snake_case
     */
    function isSnakeCase(name) {
      return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name);
    }

    /**
     * Convert camelCase or PascalCase to snake_case
     */
    function toSnakeCase(str) {
      return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
    }

    /**
     * Check if property has @ApiProperty decorator
     */
    function hasApiPropertyDecorator(node) {
      if (!node.decorators) return false;

      return node.decorators.some(decorator => {
        const expression = decorator.expression;
        if (expression.type === 'CallExpression') {
          const callee = expression.callee;
          return callee.name === 'ApiProperty' || callee.name === 'ApiPropertyOptional';
        }
        return expression.name === 'ApiProperty' || expression.name === 'ApiPropertyOptional';
      });
    }

    /**
     * Known pagination fields mapping
     */
    const paginationFields = {
      'hasNext': 'has_next_page',
      'hasPrev': 'has_prev_page',
      'totalPages': 'total_pages',
    };

    /**
     * Check if this is a pagination-related class or interface
     */
    function isPaginationRelated(node) {
      if (node.id && node.id.name) {
        const name = node.id.name;
        return name.includes('Pagination') || name.includes('Response');
      }
      return false;
    }

    return {
      // Check class properties (for DTOs)
      PropertyDefinition(node) {
        // Skip private properties
        if (node.accessibility === 'private') return;

        const propertyName = node.key.name;
        if (!propertyName) return;

        // Check for common pagination field mistakes
        if (paginationFields[propertyName]) {
          context.report({
            node,
            messageId: 'paginationFieldRequired',
            data: {
              propertyName,
              correctName: paginationFields[propertyName],
            },
            fix(fixer) {
              return fixer.replaceText(node.key, paginationFields[propertyName]);
            },
          });
          return;
        }

        // If property has @ApiProperty decorator, enforce snake_case
        if (hasApiPropertyDecorator(node) && !isSnakeCase(propertyName)) {
          const suggestion = toSnakeCase(propertyName);
          context.report({
            node,
            messageId: 'snakeCaseRequired',
            data: {
              propertyName,
              suggestion,
            },
            fix(fixer) {
              return fixer.replaceText(node.key, suggestion);
            },
          });
        }
      },

      // Check interface properties
      'TSPropertySignature'(node) {
        const propertyName = node.key.name;
        if (!propertyName) return;

        // Get parent to check if it's a pagination or response interface
        let parent = node.parent;
        while (parent && parent.type !== 'TSInterfaceDeclaration') {
          parent = parent.parent;
        }

        if (parent && isPaginationRelated(parent)) {
          // Check for pagination field mistakes
          if (paginationFields[propertyName]) {
            context.report({
              node,
              messageId: 'paginationFieldRequired',
              data: {
                propertyName,
                correctName: paginationFields[propertyName],
              },
              fix(fixer) {
                return fixer.replaceText(node.key, paginationFields[propertyName]);
              },
            });
            return;
          }

          // Enforce snake_case for response interfaces
          if (!isSnakeCase(propertyName)) {
            const suggestion = toSnakeCase(propertyName);
            context.report({
              node,
              messageId: 'snakeCaseRequired',
              data: {
                propertyName,
                suggestion,
              },
              fix(fixer) {
                return fixer.replaceText(node.key, suggestion);
              },
            });
          }
        }
      },
    };
  },
};
