import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators';

@ApiTags('Health & Monitoring')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'System health check and dependency connectivity' })
  @ApiResponse({ status: 200, description: 'Service is healthy and database is connected' })
  @ApiResponse({ status: 503, description: 'Service or database is unhealthy' })
  async checkHealth(@Res() res: Response) {
    let dbStatus = 'healthy';
    let dbError: string | undefined;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'degraded_or_unreachable';
      dbError = error.message;
    }

    const memoryUsage = process.memoryUsage();
    const isHealthy = dbStatus === 'healthy';

    const healthData = {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'safeher-backend',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: {
          status: dbStatus,
          error: dbError,
        },
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMb: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        },
      },
    };

    return res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({
        success: isHealthy,
        data: healthData,
        timestamp: new Date().toISOString(),
      });
  }
}
