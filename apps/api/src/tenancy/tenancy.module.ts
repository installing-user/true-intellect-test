import { Module } from '@nestjs/common';
import { AccessService } from './application/access.service.js';
import { TenancyRepository } from './infrastructure/tenancy.repository.js';

@Module({
  providers: [AccessService, TenancyRepository],
  exports: [AccessService],
})
export class TenancyModule {}
