import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  it('should return service info on GET /', () => {
    const result = appController.getRoot();
    expect(result).toHaveProperty('service', 'SafeHer Campus Backend API');
    expect(result).toHaveProperty('status', 'online');
    expect(result).toHaveProperty('apiPrefix', '/api/v1');
  });

  it('should handle HEAD / without errors', () => {
    expect(() => appController.headRoot()).not.toThrow();
  });
});
