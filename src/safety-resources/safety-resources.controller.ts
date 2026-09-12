import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SafetyResourcesService } from './safety-resources.service';
import { Public } from '../common/decorators';

@ApiTags('Safety Resources & Guidelines')
@Controller('safety-resources')
export class SafetyResourcesController {
  constructor(private readonly safetyResourcesService: SafetyResourcesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get statutory POSH guidelines, safety guides, and legal protections' })
  @ApiResponse({ status: 200, description: 'List of active safety resources' })
  async getResources() {
    return this.safetyResourcesService.getAllActiveResources();
  }

  @Public()
  @Get('contacts')
  @ApiOperation({ summary: 'Get 24/7 institutional and national emergency helplines' })
  @ApiResponse({ status: 200, description: 'List of emergency contacts' })
  async getContacts() {
    return this.safetyResourcesService.getEmergencyContacts();
  }
}
