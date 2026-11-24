import { Controller, Get, Query } from '@nestjs/common';
import { SessionUser } from '../../identity/domain/session-user.js';
import { CurrentUser } from '../../identity/presentation/current-user.decorator.js';
import { ParseIdPipe } from '../../shared/presentation/query.pipes.js';
import { CatalogService } from '../application/catalog.service.js';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('companies')
  companies(@CurrentUser() user: SessionUser) {
    return this.catalog.companies(user);
  }

  @Get('branches')
  branches(@CurrentUser() user: SessionUser, @Query('companyId', ParseIdPipe) companyId?: number) {
    return this.catalog.branches(user, companyId);
  }
}
