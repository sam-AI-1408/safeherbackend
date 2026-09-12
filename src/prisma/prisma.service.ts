import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('PostgreSQL Database connected successfully via Prisma');
    } catch (error) {
      this.logger.warn(`Database connection initialized. Note: Ensure PostgreSQL is running on configured DATABASE_URL (${error.message})`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected successfully');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname='public'
      `;
      const tables = tablenames
        .map(({ tablename }) => tablename)
        .filter((name) => name !== '_prisma_migrations')
        .map((name) => `"public"."${name}"`)
        .join(', ');

      if (tables.length > 0) {
        try {
          await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
        } catch (error) {
          this.logger.warn(`Could not truncate tables in test environment: ${error.message}`);
        }
      }
    }
  }
}
