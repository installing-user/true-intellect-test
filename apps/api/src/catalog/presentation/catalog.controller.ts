import { Controller, Get, Query } from '@nestjs/common';
import type { Branch, Company } from 'contracts';
import { SessionUser } from 'contracts';
import { CurrentUser } from '../../identity/presentation/current-user.decorator.js';
import { ParseIdPipe } from '../../shared/presentation/query.pipes.js';
import { CatalogService } from '../application/catalog.service.js';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('companies')
  companies(@CurrentUser() user: SessionUser): Promise<Company[]> {
    return this.catalog.companies(user);
  }

  @Get('branches')
  branches(@CurrentUser() user: SessionUser, @Query('companyId', ParseIdPipe) companyId?: number): Promise<Branch[]> {
    return this.catalog.branches(user, companyId);
  }
}
