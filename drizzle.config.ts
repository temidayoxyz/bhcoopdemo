import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './data/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./data/seedcoop-demo.db',
  },
});
