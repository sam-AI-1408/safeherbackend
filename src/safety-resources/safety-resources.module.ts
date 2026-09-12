import { Module } from '@nestjs/common';
import { SafetyResourcesController } from './safety-resources.controller';
import { SafetyResourcesService } from './safety-resources.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SafetyResourcesController],
  providers: [SafetyResourcesService],
  exports: [SafetyResourcesService],
})
export class SafetyResourcesModule {}
