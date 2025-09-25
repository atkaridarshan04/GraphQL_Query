const fetch = require('node-fetch');

/**
 * Depth Limit Tests for web API
 * @param {Object} config - Config object with TOP_LEVEL_FIELD, CIRCULAR_REF_FIELD, ANY_TOP_LEVEL_FIELD_ID, QUERY_DEPTH_LIMIT, API_URL
 * @returns {Object} - { success, logs, result }
 */
const depthLimitTestWeb = {
  max: async (config) => {
    const logs = [];
    let success = true;

    function setDynamicQueryBody(depthLimit) {
      let dynamicQueryBody = `${config.TOP_LEVEL_FIELD}(id: ${config.ANY_TOP_LEVEL_FIELD_ID}) {`;
      let depth = 1;
      let endOfQuery = 'id}';
      let lastFieldAddedToQuery = config.TOP_LEVEL_FIELD;

      while (depth < depthLimit) {
        if (lastFieldAddedToQuery === config.TOP_LEVEL_FIELD) {
          dynamicQueryBody += `${config.CIRCULAR_REF_FIELD} {`;
          lastFieldAddedToQuery = config.CIRCULAR_REF_FIELD;
        } else {
          dynamicQueryBody += `${config.TOP_LEVEL_FIELD} {`;
          lastFieldAddedToQuery = config.TOP_LEVEL_FIELD;
        }
        endOfQuery += '}';
        depth++;
      }
      return dynamicQueryBody + endOfQuery;
    }

    const queryBody = setDynamicQueryBody(config.QUERY_DEPTH_LIMIT + 1);
    logs.push('Starting max depth test...');

    try {
      const res = await fetch(config.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query depthLimitTestDynamic { ${queryBody} }`,
        }),
      });

      if (res.status < 200 || res.status > 299) {
        logs.push(
          `Test passed: Query blocked above depth limit of ${config.QUERY_DEPTH_LIMIT}.`
        );
      } else {
        logs.push(
          `Test failed: Query exceeded depth limit but was not blocked.`
        );
        success = false;
      }
    } catch (err) {
      logs.push(`Error during request: ${err.message}`);
      success = false;
    }

    return { success, logs, result: { testedDepth: config.QUERY_DEPTH_LIMIT + 1 } };
  },

  incremental: async (config) => {
    const logs = [];
    let incrementalDepth = 1;
    let success = true;

    function setDynamicQueryBody(depthLimit) {
      let dynamicQueryBody = `${config.TOP_LEVEL_FIELD}(id: ${config.ANY_TOP_LEVEL_FIELD_ID}) {`;
      let depth = 1;
      let endOfQuery = 'id}';
      let lastFieldAddedToQuery = config.TOP_LEVEL_FIELD;

      while (depth < depthLimit) {
        if (lastFieldAddedToQuery === config.TOP_LEVEL_FIELD) {
          dynamicQueryBody += `${config.CIRCULAR_REF_FIELD} {`;
          lastFieldAddedToQuery = config.CIRCULAR_REF_FIELD;
        } else {
          dynamicQueryBody += `${config.TOP_LEVEL_FIELD} {`;
          lastFieldAddedToQuery = config.TOP_LEVEL_FIELD;
        }
        endOfQuery += '}';
        depth++;
      }
      return dynamicQueryBody + endOfQuery;
    }

    logs.push('Starting incremental depth test...');
    while (incrementalDepth <= config.QUERY_DEPTH_LIMIT) {
      const queryBody = setDynamicQueryBody(incrementalDepth);
      try {
        const res = await fetch(config.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query depthLimitTestDynamic { ${queryBody} }`,
          }),
        });

        if (res.status < 200 || res.status > 299) {
          success = false;
          logs.push(`Query blocked at depth ${incrementalDepth}. Test passed.`);
          break;
        } else {
          logs.push(`Query at depth ${incrementalDepth} executed successfully.`);
        }
      } catch (err) {
        success = false;
        logs.push(`Error at depth ${incrementalDepth}: ${err.message}`);
        break;
      }

      incrementalDepth++;
    }

    if (success) {
      logs.push(
        `Query depth not limited to ${config.QUERY_DEPTH_LIMIT}. Test failed.`
      );
    }

    return {
      success,
      logs,
      result: { testedDepth: incrementalDepth - 1 },
    };
  },
};

module.exports = { depthLimitTestWeb };
