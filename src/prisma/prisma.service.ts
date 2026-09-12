import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  isDatabaseConfigured(): boolean {
    const url = process.env.DATABASE_URL;
    return typeof url === 'string' && url.trim().length > 0;
  }

  async onModuleInit() {
    if (!this.isDatabaseConfigured()) {
      this.logger.error(
        '❌ [PrismaService] DATABASE_URL environment variable is missing or empty! ' +
        'Please configure DATABASE_URL in your Render Web Service Settings -> Environment ' +
        '(use the Render PostgreSQL Internal Database URL). Prisma database operations are paused until configured.'
      );
      return;
    }

    try {
      await this.$connect();
      this.logger.log('✅ PostgreSQL Database connected successfully via Prisma');
    } catch (error) {
      this.logger.error(
        `❌ [PrismaService] Failed to connect to PostgreSQL: ${error.message}. ` +
        'Ensure the Render PostgreSQL instance (safer-db) is active and DATABASE_URL is valid.'
      );
    }
  }

  async onModuleDestroy() {
    if (this.isDatabaseConfigured()) {
      try {
        await this.$disconnect();
        this.logger.log('Database disconnected successfully');
      } catch (error) {
        this.logger.warn(`Error during database disconnection: ${error.message}`);
      }
    }
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
