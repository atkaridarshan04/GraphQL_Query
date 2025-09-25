const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const loadConfig = require('./src/loadConfig.js');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Qevlar test imports
const maliciousInjectionTestWeb = require('./src/tests/maliciousInjectionTests.js');
const { fieldDuplicationTestWeb } = require('./src/tests/fieldDuplicationTest.js');
const { depthLimitTestWeb } = require('./src/tests/depthLimitTests.js');
const { adaptiveRateLimitingTestWeb } = require('./src/tests/adaptiveRateLimitingTest.js');
const rateLimitTestWeb = require('./src/tests/rateLimitTest.js');
const { batchTestWeb } = require('./src/tests/queryBatchTest.js');
const getSchema = require('./src/getSchema.js');

// Helper to catch errors and return structured JSON
const handleTest = (fn) => async (req, res) => {
  try {
    const output = await fn(req.body);
    res.json({
      success: true,
      logs: output.logs || [],
      result: output.result || output,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack,
    });
  }
};

// Generate Config
app.post('/generate-config', handleTest(async ({ apiUrl }) => {
  if (!apiUrl) throw new Error('apiUrl is required');
  const schema = await getSchema(apiUrl);
  return {
    logs: ['Generating configuration...'],
    result: { message: 'Config generated!', schema }
  };
}));

// Rate Limit Test
app.post('/rate-limit', handleTest(async () => {
  const config = await loadConfig();
  return await rateLimitTestWeb(config);
}));

// Adaptive Rate Limiting Test
app.post('/adaptive-rate-limit', handleTest(async () => {
  const config = await loadConfig();
  return await adaptiveRateLimitingTestWeb(config);
}));

// Depth Limit Tests
app.post('/depth-max', handleTest(async () => {
  const config = await loadConfig();
  return await depthLimitTestWeb.max(config);
}));

app.post('/depth-incremental', handleTest(async () => {
  const config = await loadConfig();
  return await depthLimitTestWeb.incremental(config);
}));

// Field Duplication Test
app.post('/field-duplication', handleTest(async () => {
  const config = await loadConfig();
  return await fieldDuplicationTestWeb(config);
}));

// Batch Test
app.post('/batch-test', handleTest(async ({ numBatches = 100, batchLength = 10 }) => {
  const config = await loadConfig();
  return await batchTestWeb(config, numBatches, batchLength);
}));

// Malicious Injection Tests
app.post('/malicious/sql', handleTest(async () => {
  const config = await loadConfig();
  return await maliciousInjectionTestWeb(config); // SQL included in module
}));

app.post('/malicious/nosql', handleTest(async () => {
  const config = await loadConfig();
  return await maliciousInjectionTestWeb(config); // NoSQL included in module
}));

app.post('/malicious/xss', handleTest(async () => {
  const config = await loadConfig();
  return await maliciousInjectionTestWeb(config); // XSS included in module
}));

app.post('/malicious/os', handleTest(async () => {
  const config = await loadConfig();
  return await maliciousInjectionTestWeb(config); // OS included in module
}));

// Start server
app.listen(port, () => {
  console.log(`✅ Qevlar Express API running at http://localhost:${port}`);
});
