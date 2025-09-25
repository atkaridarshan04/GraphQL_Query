const fetch = require('node-fetch');
// const { greenBold, highlight, green } = require('../../color'); // optional for logs
// const validateConfig = require('../../__tests__/validateConfig'); // optional, can still call if needed

/**
 * Adaptive Rate Limiting Test for web API
 * @param {Object} config - Configuration object
 * @returns {Object} - JSON with success, logs, result
 */
async function adaptiveRateLimitingTestWeb(config) {
  // Optional: validate config if you want
  // validateConfig(config);

  const logs = [];
  const query = `{ ${config.TOP_LEVEL_FIELD} { ${config.SUB_FIELD} } }`;
  let rate = config.INITIAL_RATE;
  let success = true;
  let resultData = null;

  logs.push('Starting Adaptive Rate Limiting Test...');

  while (success && rate < config.QUERY_RATE_LIMIT) {
    logs.push(`Testing at rate: ${rate} requests per unit time...`);

    try {
      for (let i = 0; i < rate; i++) {
        await sendGraphQLRequest(config.API_URL, query);
      }
      logs.push(`Success: API accepted ${rate} requests per unit time.`);
      rate += config.INCREMENT;
    } catch (error) {
      success = false;
      logs.push('Test completed');
      logs.push('Summary of Test Failure:');
      logs.push(`- Failed at rate: ${rate} requests per unit time.`);
      logs.push(`- Error Message: ${error.message}`);
      logs.push(
        `- Possible rate limit of the API is just below ${rate} requests per unit time.`
      );
    }
  }

  if (!success) {
    logs.push(
      'Consider adjusting the rate limits for better performance or resilience.'
    );
    resultData = { status: 'failed', testedRate: rate };
  } else {
    logs.push(
      'Test concluded: No rate limiting detected within the tested range.'
    );
    resultData = { status: 'success', testedRate: rate - config.INCREMENT };
  }

  return { success, logs, result: resultData };
}

// Helper to send GraphQL request
async function sendGraphQLRequest(url, query) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

module.exports = { adaptiveRateLimitingTestWeb };
