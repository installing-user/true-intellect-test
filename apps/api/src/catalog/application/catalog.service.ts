import { Injectable } from '@nestjs/common';
import { SessionUser } from '../../identity/domain/session-user.js';
import { AccessService } from '../../tenancy/application/access.service.js';
import { CatalogRepository } from '../infrastructure/catalog.repository.js';

@Injectable()
export class CatalogService {
  constructor(
    private readonly access: AccessService,
    private readonly catalog: CatalogRepository,
  ) {}

  async companies(user: SessionUser) {
    const scope = await this.access.resolveScope(user, {});
    return this.catalog.companies(scope.companyId);
  }

  async branches(user: SessionUser, companyId?: number) {
    const scope = await this.access.resolveScope(user, { companyId });
    return this.catalog.branches(scope.companyId);
  }
}
