# Pagination Response Format Standardization

## Summary

Successfully standardized all pagination response formats across the entire codebase to use snake_case naming convention.

## Changes Made

### 1. Backend Changes

#### Shared Pagination DTO
- ✅ Created `src/common/dto/pagination.dto.ts`
  - Exports `PaginationDto` class with snake_case fields
  - Exports `calculatePagination()` helper function
  - Fully documented with JSDoc comments

#### User Management Module
- ✅ Updated `src/modules/user-management/dto/get-users-response.dto.ts`
  - Removed duplicate PaginationDto
  - Now imports from `src/common/dto`
- ✅ Updated `src/modules/user-management/user-management.service.ts`
  - Uses `calculatePagination()` helper
  - Returns proper snake_case fields

#### Telegram Groups Module
- ✅ Updated `src/modules/telegram-groups/telegram-groups.service.ts`
  - Uses shared `PaginationDto` interface
  - Uses `calculatePagination()` helper
  - Consistent with user-management

### 2. Frontend Changes

#### API Client
- ✅ Updated `frontend/lib/api/client.ts`
  - `Pagination` interface now uses snake_case:
    - `has_next_page` (was `hasNext`)
    - `has_prev_page` (was `hasPrev`)
    - `total_pages` (was missing)

#### Components
- ✅ Updated `frontend/components/user-management/UserList.tsx`
  - Uses `has_next_page` and `has_prev_page`
- ✅ Updated `frontend/components/telegram-groups/TelegramGroupList.tsx`
  - Already using correct snake_case format

### 3. Test Updates

#### Backend Tests
- ✅ Updated `test/contract/user-management/user-management.get.spec.ts`
  - All pagination assertions use snake_case
  - Added `total_pages` field
- ✅ Updated `test/contract/telegram-groups/telegram-groups-list.contract.spec.ts`
  - Uses `response.body.pagination` structure
  - All snake_case fields
- ✅ Updated `test/integration/telegram-groups-*.spec.ts`
  - Changed `result.groups` to `result.data`
  - Changed `channelInfo` to `channel_info`
- ✅ Updated `test/integration/telegram-channel-connection.integration.spec.ts`
  - Fixed `channelInfo` to `channel_info`

### 4. Documentation & Enforcement

#### Documentation
- ✅ Created `API_NAMING_CONVENTIONS.md`
  - Complete guide for snake_case API responses
  - Examples of correct/incorrect usage
  - Migration guide
  - Enforcement strategies

#### ESLint Configuration
- ✅ Updated `.eslintrc.js`
  - Added documentation comments about snake_case requirement
  - Explains enforcement through code review and tests
  - References shared PaginationDto

#### Custom ESLint Rules (Reference)
- ✅ Created `eslint-rules/enforce-snake-case-api-response.js`
  - Custom rule implementation (for reference)
  - Not actively enforced due to complexity
  - Can be enabled in future if needed
- ✅ Created `eslint-rules/README.md`
  - Documentation for custom rules
  - Usage examples

## Final Response Format

All list endpoints now return:

```typescript
{
  data: Array<T>,
  pagination: {
    total: number,
    page: number,
    limit: number,
    total_pages: number,
    has_next_page: boolean,
    has_prev_page: boolean
  }
}
```

## Pagination Helper Usage

```typescript
import { calculatePagination } from '../../common/dto';

// In your service
const [items, total] = await repository.findAndCount({ ...options });

return {
  data: items,
  pagination: calculatePagination(total, page, limit),
};
```

## Enforcement Strategy

1. **Shared DTO**: Use `PaginationDto` from `src/common/dto`
2. **Helper Function**: Use `calculatePagination()` to ensure correct fields
3. **Contract Tests**: Validate response schema in contract tests
4. **Code Review**: Check for snake_case in all API responses
5. **Documentation**: Refer to `API_NAMING_CONVENTIONS.md`

## Migration Checklist

When creating new API endpoints:

- [ ] Use `PaginationDto` from `src/common/dto`
- [ ] Use `calculatePagination()` helper
- [ ] All DTO properties use snake_case
- [ ] Contract tests validate response schema
- [ ] Frontend interface matches backend response

## Files Modified

### Backend
- `src/common/dto/pagination.dto.ts` (new)
- `src/common/dto/index.ts` (new)
- `src/modules/user-management/dto/get-users-response.dto.ts`
- `src/modules/user-management/user-management.service.ts`
- `src/modules/telegram-groups/telegram-groups.service.ts`
- `src/modules/telegram-groups/telegram-groups.controller.ts`
- `.eslintrc.js`

### Frontend
- `frontend/lib/api/client.ts`
- `frontend/components/user-management/UserList.tsx`

### Tests
- `test/contract/user-management/user-management.get.spec.ts`
- `test/contract/telegram-groups/telegram-groups-list.contract.spec.ts`
- `test/integration/telegram-groups-crud.integration.spec.ts`
- `test/integration/telegram-groups-tenant-isolation.integration.spec.ts`
- `test/integration/telegram-channel-connection.integration.spec.ts`

### Documentation
- `API_NAMING_CONVENTIONS.md` (new)
- `PAGINATION_STANDARDIZATION.md` (this file, new)
- `eslint-rules/README.md` (new)
- `eslint-rules/enforce-snake-case-api-response.js` (new, reference)

## Verification

✅ TypeScript compilation: 0 errors
✅ All tests updated to use snake_case
✅ Frontend and backend interfaces match
✅ Shared PaginationDto prevents future inconsistencies

## Next Steps

1. Run full test suite to verify all changes
2. Update CLAUDE.md to reference new standards
3. Add pagination standardization to PR checklist
4. Consider adding pre-commit hook for snake_case validation
