const { createConnection } = require('typeorm');

module.exports = async () => {
  const connection = await createConnection();
  await connection.query('DELETE FROM client WHERE id = 0;');
  await connection.close();
};
