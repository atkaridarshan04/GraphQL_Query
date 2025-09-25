const fs = require('fs').promises;
const path = require('path');

async function loadConfig() {
  const data = await fs.readFile(path.join(__dirname, '../qevlarConfig.json'), 'utf-8');
  return JSON.parse(data);
}

module.exports = loadConfig;
