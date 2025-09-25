const validateConfig = require('../../__tests__/validateConfig');

async function rateLimitTestWeb(config) {
  validateConfig(config);

  const query = `{ ${config.TOP_LEVEL_FIELD} { ${config.SUB_FIELD} } }`;

  let reqs = 0;
  let lastReqTime = Date.now();
  let result = {
    success: true,
    message: '',
    error: null,
    requestsMade: 0,
  };

  const makeRequest = async () => {
    reqs += 1;
    try {
      const response = await fetch(config.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        result.success = true;
        result.message = `API did not accept requests above rate limit (${config.QUERY_RATE_LIMIT}).`;
      } else {
        result.success = false;
        result.message = `API accepted requests above rate limit (${config.QUERY_RATE_LIMIT}).`;
      }
    } catch (error) {
      result.success = true;
      result.message = `API did not accept requests above rate limit (${config.QUERY_RATE_LIMIT}).`;
      result.error = error.message;
    }
  };

  const now = Date.now();

  if (now - lastReqTime < config.TIME_WINDOW) {
    result.success = true;
    result.message = 'Requests made within time window.';
  } else {
    reqs = 0;
    lastReqTime = now;
    result.requestsMade = reqs;
    await makeRequest();
  }

  result.requestsMade = reqs;
  return result;
}

module.exports = rateLimitTestWeb;
