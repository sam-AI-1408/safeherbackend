import { Controller, Get, Head } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './common/decorators';

@ApiTags('System Root')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'System root status and discovery' })
  @ApiResponse({ status: 200, description: 'Service operational' })
  getRoot() {
    return {
      service: 'SafeHer Campus Backend API',
      status: 'online',
      version: '1.0.0',
      apiPrefix: '/api/v1',
      health: '/api/v1/health',
      docs: '/api/docs',
    };
  }

  @Public()
  @Head()
  @ApiOperation({ summary: 'Liveness HEAD ping for load balancers and Render health checks' })
  @ApiResponse({ status: 200, description: 'Service active' })
  headRoot() {
    return;
  }
}
