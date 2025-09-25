const fetch = require('node-fetch');

/**
 * Malicious Injection Tests for web/API
 * @param {Object} config - Config object with relevant fields
 * @returns {Object} - { success, logs, result }
 */
async function maliciousInjectionTestWeb(config) {
  const logs = [];
  const result = {
    SQL: { blocked: [], allowed: [] },
    NoSQL: { blocked: [], allowed: [] },
    XSS: { blocked: [], allowed: [] },
    OS: { blocked: [], allowed: [] },
  };

  // Helper function to test injections
  async function testInjections(type, injections, buildPayload) {
    logs.push(`Starting ${type} injection test...`);
    for (const injection of injections) {
      try {
        const payload = buildPayload(injection);
        const res = await fetch(config.API_URL, payload);
        if (!res.ok) {
          result[type].blocked.push(injection);
        } else {
          result[type].allowed.push(injection);
        }
      } catch (err) {
        result[type].blocked.push(injection);
      }
    }
    logs.push(`${type} test complete. Blocked: ${result[type].blocked.length}, Allowed: ${result[type].allowed.length}`);
  }

  // SQL injection
  if (config.SQL) {
    const potentiallyMaliciousSQL = [
      "1=1", `' OR`, "select sqlite_version()", "@@version", "DROP TABLE", "UNION SELECT null",
      // ... add all the others
    ];
    await testInjections("SQL", potentiallyMaliciousSQL, (injection) => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query { ${config.SQL_TABLE_NAME}(sql: "${injection}") { ${config.SQL_COLUMN_NAME} } }`,
      }),
    }));
  }

  // NoSQL injection
  if (config.NO_SQL) {
    const potentiallyMaliciousNoSQL = [
      "true, $where: '1 == 1'", ", $where: '1 == 1'", "$where: '1 == 1'",
      // ... add all the others
    ];
    await testInjections("NoSQL", potentiallyMaliciousNoSQL, (injection) => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query { ${config.SQL_TABLE_NAME}(sql: "${injection}") { ${config.SQL_COLUMN_NAME} } }`,
      }),
    }));
  }

  // XSS injection
  const potentiallyMaliciousXSS = [
    '"-prompt(8)-"', "'-prompt(8)-'", '<script>alert(1)</script>',
    // ... add all the others
  ];
  await testInjections("XSS", potentiallyMaliciousXSS, (injection) => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query { ${config.TOP_LEVEL_FIELD}(id: ${config.ANY_TOP_LEVEL_FIELD_ID}) { id # ${injection} } }`,
    }),
  }));

  // OS command injection
  const potentiallyMaliciousOS = [
    `' ; ls -la'`, `' ; cat /etc/passwd'`, `' ; id'`,
    // ... add all the others
  ];
  await testInjections("OS", potentiallyMaliciousOS, (injection) => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: injection }),
  }));

  const success = Object.values(result).every((r) => r.allowed.length === 0);
  return { success, logs, result };
}

module.exports = { maliciousInjectionTestWeb };
