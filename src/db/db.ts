import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';

// Since we are running the server in the workspace root, data/seedcoop-demo.db is accessible.
const client = createClient({
  url: 'file:./data/seedcoop-demo.db',
});

export const db = drizzle(client, { schema });
