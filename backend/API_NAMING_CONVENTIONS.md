# API Response Naming Conventions

## Overview

All API response DTOs and interfaces in this project **MUST** use `snake_case` for property names to maintain consistency across the entire stack.

## Why snake_case?

1. **Database Consistency**: Matches TypeORM entity fields and database column names (`telegram_chat_id`, `bot_id`, `created_at`)
2. **PostgreSQL Convention**: Aligns with standard PostgreSQL naming
3. **API Consistency**: All API response fields use snake_case (`connection_status`, `sync_enabled`, `bot_assigned`)
4. **Frontend Expectation**: Frontend expects snake_case from API responses

## Rules

### ✅ Correct Examples

```typescript
// DTO class
export class UserResponseDto {
  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty()
  created_at: string;
}

// Interface
export interface PaginationDto {
  total: number;
  page: number;
  limit: number;
  total_pages: number;        // ✅
  has_next_page: boolean;     // ✅
  has_prev_page: boolean;     // ✅
}

// Response
export interface TelegramGroupsListResponse {
  data: TelegramGroup[];
  pagination: PaginationDto;
}
```

### ❌ Incorrect Examples

```typescript
// ❌ WRONG - camelCase
export class UserResponseDto {
  @ApiProperty()
  firstName: string;     // ❌ Should be: first_name

  @ApiProperty()
  lastName: string;      // ❌ Should be: last_name

  @ApiProperty()
  createdAt: string;     // ❌ Should be: created_at
}

// ❌ WRONG - camelCase pagination
export interface PaginationDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;    // ❌ Should be: total_pages
  hasNext: boolean;      // ❌ Should be: has_next_page
  hasPrev: boolean;      // ❌ Should be: has_prev_page
}
```

## Common Mistakes

### Pagination Fields

**Always use:**
- ✅ `has_next_page`
- ✅ `has_prev_page`
- ✅ `total_pages`

**Never use:**
- ❌ `hasNext` or `hasNextPage`
- ❌ `hasPrev` or `hasPrevPage`
- ❌ `totalPages`

### Timestamp Fields

**Always use:**
- ✅ `created_at`
- ✅ `updated_at`
- ✅ `last_login_at`
- ✅ `expires_at`

**Never use:**
- ❌ `createdAt`
- ❌ `updatedAt`
- ❌ `lastLoginAt`
- ❌ `expiresAt`

## Enforcement

### 1. Use Shared Components

Always use the shared `PaginationDto` from `src/common/dto/pagination.dto.ts`:

```typescript
import { PaginationDto, calculatePagination } from '../../common/dto';

// In your service
return {
  data: items,
  pagination: calculatePagination(total, page, limit),
};
```

### 2. Contract Tests

All API endpoints must have contract tests that validate response schemas:

```typescript
it('should return response with snake_case fields', async () => {
  const response = await request(app.getHttpServer())
    .get('/v1/telegram-groups')
    .expect(200);

  expect(response.body).toMatchObject({
    data: expect.any(Array),
    pagination: expect.objectContaining({
      total: expect.any(Number),
      page: expect.any(Number),
      limit: expect.any(Number),
      total_pages: expect.any(Number),      // Must use snake_case
      has_next_page: expect.any(Boolean),   // Must use snake_case
      has_prev_page: expect.any(Boolean),   // Must use snake_case
    }),
  });
});
```

### 3. Code Review Checklist

Reviewers must check:
- [ ] All DTO properties use snake_case
- [ ] All response interfaces use snake_case
- [ ] Pagination uses correct field names
- [ ] Contract tests validate snake_case fields
- [ ] No camelCase in @ApiProperty decorated properties

### 4. Pre-commit Hook (Optional)

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check for camelCase in DTO files
if git diff --cached --name-only | grep -E '\.dto\.ts$' | xargs grep -E '@ApiProperty.*\n.*[a-z]+[A-Z]' > /dev/null; then
  echo "❌ Error: Found camelCase in DTO files. Use snake_case for all API response properties."
  echo "See API_NAMING_CONVENTIONS.md for details."
  exit 1
fi
```

## Migration Guide

If you have existing camelCase properties:

1. **Update the DTO/Interface:**
   ```typescript
   // Before
   firstName: string;

   // After
   first_name: string;
   ```

2. **Update the Service:**
   ```typescript
   // Before
   return {
     firstName: user.first_name,
   };

   // After
   return {
     first_name: user.first_name,
   };
   ```

3. **Update Frontend:**
   ```typescript
   // Before
   <div>{user.firstName}</div>

   // After
   <div>{user.first_name}</div>
   ```

4. **Update Tests:**
   ```typescript
   // Before
   expect(response.body.firstName).toBeDefined();

   // After
   expect(response.body.first_name).toBeDefined();
   ```

## Reference Implementation

See these files for correct implementation:
- `src/common/dto/pagination.dto.ts` - Shared pagination DTO
- `src/modules/telegram-groups/telegram-groups.service.ts` - Uses calculatePagination()
- `src/modules/telegram-groups/dto/*.dto.ts` - All use snake_case
- `test/contract/telegram-groups/*.spec.ts` - Contract tests validate snake_case

## Questions?

Check the existing implementation in:
1. Telegram Groups module (feature 003)
2. User Management module (feature 002)

Both modules follow the snake_case convention correctly.
