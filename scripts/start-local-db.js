let EmbeddedPostgres;
try {
  EmbeddedPostgres = require('embedded-postgres').default || require('embedded-postgres');
} catch (_) {
  console.log('ℹ️ embedded-postgres is not installed. Use standard PostgreSQL via DATABASE_URL or install embedded-postgres for local development.');
  process.exit(0);
}

const dataDir = path.resolve(__dirname, '..', '.pgdata');

async function main() {
  console.log('🚀 Initializing Local PostgreSQL Engine on port 5432...');

  const isFirstRun = !fs.existsSync(dataDir);

  const pg = new EmbeddedPostgres({
    port: 5432,
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    persistent: true,
  });

  if (isFirstRun) {
    console.log('📁 Creating initial PostgreSQL cluster data directory...');
    await pg.initialise();
  }

  await pg.start();
  console.log('✅ PostgreSQL running on localhost:5432 (User: postgres)');

  try {
    await pg.createDatabase('safeher_db');
    console.log('📦 Database "safeher_db" created/verified.');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('📦 Database "safeher_db" exists.');
    } else {
      console.log('ℹ️ Database status:', err.message);
    }
  }

  console.log('🌟 PostgreSQL Local Engine Ready!');
}

main().catch((err) => {
  console.error('❌ Failed to start local PostgreSQL:', err);
  process.exit(1);
});
