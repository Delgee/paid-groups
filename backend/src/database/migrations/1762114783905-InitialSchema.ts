import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Initial Schema Migration
 *
 * This migration records the initial database schema state with plaintext bot_token storage.
 * The schema was created using TypeORM's synchronize feature, so this migration is empty.
 *
 * Key changes from previous encrypted schema:
 * - bot_token: varchar(255) - stores plaintext tokens (was varchar(500) for encrypted)
 * - All encryption/decryption logic removed from application code
 */
export class InitialSchema1762114783905 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Schema already exists via TypeORM synchronize
        // This migration serves as a baseline for future migrations
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Cannot rollback initial schema
        throw new Error('Cannot rollback initial schema migration');
    }

}
