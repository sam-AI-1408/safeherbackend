import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController (Stage 1 Foundation Tests)', () => {
  let controller: HealthController;

  const mockPrismaService = {
    isDatabaseConfigured: jest.fn().mockReturnValue(true),
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.isDatabaseConfigured.mockReturnValue(true);
    mockPrismaService.$queryRaw.mockResolvedValue([{ '1': 1 }]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return 200 OK and healthy status structure when database is configured and reachable', async () => {
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

  it('should return 503 and missing_configuration when DATABASE_URL is not set', async () => {
    mockPrismaService.isDatabaseConfigured.mockReturnValue(false);

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.checkHealth(mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        data: expect.objectContaining({
          status: 'degraded',
          dependencies: expect.objectContaining({
            database: expect.objectContaining({
              status: 'missing_configuration',
            }),
          }),
        }),
      }),
    );
  });
});
