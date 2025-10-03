# Custom ESLint Rules

This directory contains custom ESLint rules specific to our Telegram Groups SaaS platform.

## Rules

### `enforce-snake-case-api-response`

Enforces snake_case naming convention for all API response DTOs and interfaces.

#### What it checks:

1. **DTO class properties** (in `*.dto.ts` files) with `@ApiProperty` or `@ApiPropertyOptional` decorators
2. **Response interface properties** (in files containing "Response" or "response" in the filename)
3. **Common pagination field mistakes**:
   - `hasNext` → should be `has_next_page`
   - `hasPrev` → should be `has_prev_page`
   - `totalPages` → should be `total_pages`

#### Why snake_case?

We enforce snake_case for API responses to maintain consistency with:
- Database column naming (`telegram_chat_id`, `bot_id`, `created_at`)
- Other API response fields (`connection_status`, `sync_enabled`, `bot_assigned`)
- PostgreSQL and backend conventions
- TypeORM entity fields

#### Examples:

**❌ Incorrect (camelCase):**
```typescript
export class UserResponseDto {
  @ApiProperty()
  firstName: string;  // ❌ Will trigger error

  @ApiProperty()
  lastName: string;   // ❌ Will trigger error

  createdAt: string;  // ❌ Will trigger error
}

export interface PaginationDto {
  total: number;
  page: number;
  hasNext: boolean;    // ❌ Will trigger error - should be has_next_page
  hasPrev: boolean;    // ❌ Will trigger error - should be has_prev_page
  totalPages: number;  // ❌ Will trigger error - should be total_pages
}
```

**✅ Correct (snake_case):**
```typescript
export class UserResponseDto {
  @ApiProperty()
  first_name: string;  // ✅ Correct

  @ApiProperty()
  last_name: string;   // ✅ Correct

  created_at: string;  // ✅ Correct
}

export interface PaginationDto {
  total: number;
  page: number;
  has_next_page: boolean;    // ✅ Correct
  has_prev_page: boolean;    // ✅ Correct
  total_pages: number;       // ✅ Correct
}
```

#### Auto-fix:

This rule provides automatic fixes! Run:

```bash
npm run lint:fix
```

The rule will automatically convert:
- `firstName` → `first_name`
- `hasNext` → `has_next_page`
- `hasPrev` → `has_prev_page`
- `totalPages` → `total_pages`

#### Exceptions:

- Private class properties (prefixed with `private`) are ignored
- Internal service methods can use camelCase
- Only properties exposed via `@ApiProperty` decorator are checked
- Files outside `*.dto.ts` or `*Response*.ts` patterns are ignored

#### Configuration:

In `.eslintrc.js`:

```javascript
rules: {
  'enforce-snake-case-api-response': 'error', // Enforce as error
  // OR
  'enforce-snake-case-api-response': 'warn',  // Show warnings only
}
```

## Adding New Rules

1. Create a new rule file in this directory: `my-new-rule.js`
2. Export the rule following ESLint's rule format
3. Add it to `index.js`:
   ```javascript
   module.exports = {
     rules: {
       'enforce-snake-case-api-response': require('./enforce-snake-case-api-response'),
       'my-new-rule': require('./my-new-rule'),  // Add here
     },
   };
   ```
4. Enable it in `.eslintrc.js`:
   ```javascript
   rules: {
     'my-new-rule': 'error',
   }
   ```

## Testing Rules

Test your custom rules by running:

```bash
# Check for violations
npm run lint

# Auto-fix violations
npm run lint:fix
```

## Resources

- [ESLint Custom Rules Documentation](https://eslint.org/docs/latest/extend/custom-rules)
- [AST Explorer](https://astexplorer.net/) - Visualize TypeScript AST
- [ESLint Rule Tester](https://eslint.org/docs/latest/integrate/nodejs-api#ruletester)
