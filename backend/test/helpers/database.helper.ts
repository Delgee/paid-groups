import { DataSource } from 'typeorm';

export class DatabaseHelper {
  private static dataSource: DataSource;

  static setDataSource(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  static async cleanDatabase() {
    if (!this.dataSource) {
      throw new Error('DataSource not initialized');
    }

    const entities = this.dataSource.entityMetadatas;
    
    // Disable foreign key checks
    await this.dataSource.query('SET session_replication_role = replica;');
    
    try {
      // Clear all tables in reverse order of dependencies
      const tableNames = entities
        .map(entity => `"${entity.tableName}"`)
        .filter(tableName => !tableName.includes('migration'))
        .reverse();

      for (const tableName of tableNames) {
        await this.dataSource.query(`TRUNCATE TABLE ${tableName} CASCADE;`);
      }
    } finally {
      // Re-enable foreign key checks
      await this.dataSource.query('SET session_replication_role = DEFAULT;');
    }
  }

  static async resetSequences() {
    if (!this.dataSource) {
      throw new Error('DataSource not initialized');
    }

    // Reset all sequences to 1
    const sequences = await this.dataSource.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);

    for (const { sequence_name } of sequences) {
      await this.dataSource.query(`ALTER SEQUENCE "${sequence_name}" RESTART WITH 1;`);
    }
  }

  static async seedTestData() {
    // Add any common test data seeding here if needed
    // For example, creating a default test tenant
  }
}