import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController (Stage 1 Foundation Tests)', () => {
  let controller: HealthController;

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return 200 OK and healthy status structure', async () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.checkHealth(mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          status: 'healthy',
          service: 'safeher-backend',
          version: '1.0.0',
        }),
      }),
    );
  });
});
