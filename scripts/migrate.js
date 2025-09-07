import 'dotenv/config';
import { initDatabase } from '../src/db.js';

async function main() {
  await initDatabase();
  console.log('Database initialized.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


