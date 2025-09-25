const fetch = require('node-fetch');
const validateConfig = require('../../__tests__/validateConfig');

const generateDynamicBatchQuery = (count, baseQuery) => {
  return Array(count).fill(baseQuery);
};

const sendBatchQueries = async (url, batchedQueries) => {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify(batchedQueries),
    });
    const end = Date.now();
    return { status: response.status, latency: end - start, error: null };
  } catch (error) {
    const end = Date.now();
    return { status: 'error', latency: end - start, error: error.message };
  }
};

const calculateThroughput = (numBatches, batchLength, elapsedTime) => {
  return (numBatches * batchLength) / (elapsedTime / 1000);
};

const calculateStatistics = (times) => {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, curr) => acc + curr, 0);
  const average = sum / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const percentile = (percent) => sorted[Math.floor(sorted.length * percent)];

  return {
    min,
    max,
    average,
    median,
    percentile97: percentile(0.97),
  };
};

// New API-ready function
const batchTestWeb = async (config, numBatches = 100, batchLength = 10) => {
  validateConfig(config);

  const url = config.API_URL;
  const topLevelField = config.TOP_LEVEL_FIELD;
  const anyTopLevelFieldId = config.ANY_TOP_LEVEL_FIELD_ID;
  const subField = config.SUB_FIELD;

  const query = `{ ${topLevelField}(id: "${anyTopLevelFieldId}") { ${subField} ${subField} } }`;
  const newBatch = generateDynamicBatchQuery(batchLength, query);

  const start = Date.now();
  const responseTimes = [];
  const errors = [];
  let testPassedCount = 0;
  let testFailedCount = 0;

  for (let i = 0; i < numBatches; i++) {
    const batchedQueries = newBatch.map((q) => ({ query: q }));
    const { status, latency, error } = await sendBatchQueries(url, batchedQueries);

    if (latency !== null) responseTimes.push(latency);

    if (status === 200) {
      testFailedCount++;
    } else {
      testPassedCount++;
    }

    if (error) {
      errors.push({ batch: i + 1, error });
    }
  }

  const end = Date.now();
  const elapsedTime = end - start;

  const stats = calculateStatistics(responseTimes);
  const throughput = calculateThroughput(numBatches, batchLength, elapsedTime);

  return {
    success: testFailedCount === 0,
    stats: { ...stats, throughput },
    summary: { totalBatches: numBatches, passed: testPassedCount, failed: testFailedCount },
    errors,
  };
};

module.exports = { batchTestWeb, generateDynamicBatchQuery };
