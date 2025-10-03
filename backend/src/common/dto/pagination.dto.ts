import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard pagination metadata DTO for all list responses.
 *
 * IMPORTANT: This DTO enforces snake_case naming convention for all API responses.
 * All pagination fields MUST use snake_case to maintain consistency with:
 * - Database column naming (telegram_chat_id, bot_id, etc.)
 * - Other API response fields (connection_status, sync_enabled, etc.)
 * - PostgreSQL/backend conventions
 *
 * @example
 * ```typescript
 * return {
 *   data: items,
 *   pagination: {
 *     total: 100,
 *     page: 1,
 *     limit: 20,
 *     total_pages: 5,
 *     has_next_page: true,
 *     has_prev_page: false,
 *   }
 * };
 * ```
 */
export class PaginationDto {
  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
    minimum: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  total_pages: number;

  @ApiProperty({
    description: 'Whether there is a next page available',
    example: true,
  })
  has_next_page: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page available',
    example: false,
  })
  has_prev_page: boolean;
}

/**
 * Helper function to calculate pagination metadata
 *
 * @param total - Total number of items
 * @param page - Current page number (1-based)
 * @param limit - Items per page
 * @returns PaginationDto object
 *
 * @example
 * ```typescript
 * const pagination = calculatePagination(100, 1, 20);
 * // Returns: { total: 100, page: 1, limit: 20, total_pages: 5, has_next_page: true, has_prev_page: false }
 * ```
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number,
): PaginationDto {
  const total_pages = Math.ceil(total / limit);
  const has_next_page = page < total_pages;
  const has_prev_page = page > 1;

  return {
    total,
    page,
    limit,
    total_pages,
    has_next_page,
    has_prev_page,
  };
}
