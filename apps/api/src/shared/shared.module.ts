import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseService } from './infrastructure/database.service.js';
import { HealthController } from './presentation/health.controller.js';
import { InvalidInputFilter } from './presentation/invalid-input.filter.js';

@Global()
@Module({
  controllers: [HealthController],
  providers: [DatabaseService, { provide: APP_FILTER, useClass: InvalidInputFilter }],
  exports: [DatabaseService],
})
export class SharedModule {}
