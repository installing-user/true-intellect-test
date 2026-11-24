import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { CatalogService } from './application/catalog.service.js';
import { CatalogRepository } from './infrastructure/catalog.repository.js';
import { CatalogController } from './presentation/catalog.controller.js';

@Module({
  imports: [TenancyModule],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository],
})
export class CatalogModule {}
