import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../shared/infrastructure/database.service.js';

@Injectable()
export class TenancyRepository {
  constructor(private readonly database: DatabaseService) {}

  async companyExists(companyId: number): Promise<boolean> {
    const rows = await this.database.query('SELECT 1 FROM companies WHERE id = $1', [companyId]);

    return rows.length > 0;
  }

  async branchExists(branchId: number, companyId: number | null): Promise<boolean> {
    const rows = await this.database.query(
      'SELECT 1 FROM branches b WHERE b.id = $1 AND ($2::int IS NULL OR b.company_id = $2)',
      [branchId, companyId],
    );

    return rows.length > 0;
  }
}
