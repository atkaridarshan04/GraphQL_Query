const fetch = require('node-fetch');

/**
 * Field Duplication Test for web/API
 * @param {Object} config - Config object with TOP_LEVEL_FIELD, SUB_FIELD, ANY_TOP_LEVEL_FIELD_ID, API_URL
 * @returns {Object} - { success, logs, result }
 */
async function fieldDuplicationTestWeb(config) {
  const logs = [];
  const query = `{ ${config.TOP_LEVEL_FIELD}(id: ${config.ANY_TOP_LEVEL_FIELD_ID}) { ${config.SUB_FIELD} ${config.SUB_FIELD} } }`;
  let success = true;
  let resultData = null;

  logs.push('Starting Field Duplication Test...');

  try {
    const response = await fetch(config.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok. Status: ${response.status}`);
    }

    const result = await response.json();
    const stringResult = JSON.stringify(result);

    // API accepted duplicate fields → test failed
    logs.push('Test failed: API accepted duplicate fields.');
    logs.push(`API returned: ${stringResult}`);
    success = false;

    resultData = { status: 'failed', apiResponse: result };
  } catch (error) {
    // API rejected duplicate fields → test passed
    logs.push('Test passed: API rejected duplicate fields.');
    logs.push(`Error Summary: ${error.message}`);
    success = true;

    resultData = { status: 'success', error: error.message };
  }

  return { success, logs, result: resultData };
}

module.exports = { fieldDuplicationTestWeb };
