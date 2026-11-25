import { Injectable } from '@nestjs/common';
import type { Branch, Company } from 'contracts';
import { DatabaseService } from '../../shared/infrastructure/database.service.js';

@Injectable()
export class CatalogRepository {
  constructor(private readonly database: DatabaseService) {}

  companies(companyId: number | null) {
    return this.database.query<Company>(
      'SELECT c.id, c.name FROM companies c WHERE ($1::int IS NULL OR c.id = $1) ORDER BY c.id',
      [companyId],
    );
  }

  branches(companyId: number | null) {
    return this.database.query<Branch>(
      `SELECT b.id, b.company_id AS "companyId", b.name, b.address
       FROM branches b WHERE ($1::int IS NULL OR b.company_id = $1) ORDER BY b.id`,
      [companyId],
    );
  }
}
