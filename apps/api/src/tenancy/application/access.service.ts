import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionUser } from '../../identity/domain/session-user.js';
import { Scope, ScopeRequest } from '../domain/scope.js';
import { TenancyRepository } from '../infrastructure/tenancy.repository.js';

@Injectable()
export class AccessService {
  constructor(private readonly tenancy: TenancyRepository) {}

  // 404 for both foreign and missing ids, so probing cannot reveal what exists
  async resolveScope(user: SessionUser, requested: ScopeRequest): Promise<Scope> {
    let companyId: number | null;
    if (user.role === 'client') {
      if (requested.companyId !== undefined && requested.companyId !== user.companyId) {
        throw new NotFoundException('Компания не найдена');
      }
      companyId = user.companyId;
    } else {
      companyId = requested.companyId ?? null;
      if (companyId !== null && !(await this.tenancy.companyExists(companyId))) {
        throw new NotFoundException('Компания не найдена');
      }
    }

    const branchId = requested.branchId ?? null;
    if (branchId !== null && !(await this.tenancy.branchExists(branchId, companyId))) {
      throw new NotFoundException('Филиал не найден');
    }
    return { companyId, branchId };
  }
}
