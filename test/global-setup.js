const dotenv = require('dotenv');
const fs = require('fs');
const { createConnection } = require('typeorm');

module.exports = async () => {
  dotenv.config({ path: './test/env' });
  const connection = await createConnection();
  await connection.runMigrations();
  await connection.query(`
    INSERT INTO "client" (
      "id", "name", "publicKey"
    ) VALUES (
      0, 'test', '${fs.readFileSync(__dirname + '/fixtures/public.pem')}'
    ) ON CONFLICT DO NOTHING
  `);
  await connection.close();
};

require('ts-node').register({ files: true });
