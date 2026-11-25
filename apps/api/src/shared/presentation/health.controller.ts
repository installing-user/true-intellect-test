import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../infrastructure/database.service.js';
import { Public } from './public.decorator.js';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Public()
  @Get()
  async getStatus() {
    try {
      await this.database.ping();

      return { status: 'ok', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        database: 'unavailable',
      });
    }
  }
}
