const config = require('../qevlarConfig.json');
const fs = require('fs').promises;
const path = require('path');

const introspectionQuery = `{
  __schema {
    types {
      name
      description
      fields {
        name
        description
        type {
          name
          kind
        }
      }
    }
  }
}`;

const getCircularRefField = (schema) => {
  const visited = new Set();
  let circularRef = "";

  schema.types.forEach((type) => {
    if (type.description === 'Root Query' && type.fields) {
      type.fields.forEach((field) => {
        if (field.type?.name) visited.add(field.type.name);
      });
    }

    if (type.fields) {
      type.fields.forEach((field) => {
        if (field.type?.name && visited.has(field.type.name)) {
          circularRef = field.type.name;
        }
      });
    }
  });

  // ensure it's a string
  return circularRef || "";
};


const getTopAndSubField = (schema) => {
  const types = schema.data.__schema.types;

  const circularRefField = getCircularRefField(schema.data.__schema);

  const rootQuery = types.find((type) => type.name === 'Query');

  if (!rootQuery || !rootQuery.fields || rootQuery.fields.length === 0)
    throw new Error('No root query fields found in schema');

  const topField = rootQuery.fields[0].name;
  const topObjType = rootQuery.fields[0].type?.name;

  const subType = types.find((type) => type.name === topObjType);
  if (!subType || !subType.fields || subType.fields.length === 0)
    throw new Error('No subfields found for top-level object');

  const subField = subType.fields[0].name;

  config.TOP_LEVEL_FIELD = topField;
  config.SUB_FIELD = subField;
  config.CIRCULAR_REF_FIELD = circularRefField;
};

// Fetch a real ID from the top-level field
const fetchTopLevelId = async (url, topLevelField) => {
  try {
    const query = `{ ${topLevelField} { id } }`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    const data = await res.json();
    const firstId = data.data?.[topLevelField]?.[0]?.id;
    return firstId || null;
  } catch (err) {
    console.warn('Could not fetch top-level ID:', err.message);
    return null;
  }
};

const modifyConfig = async () => {
  try {
    const configPath = path.join(__dirname, '../qevlarConfig.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`Config updated at: ${configPath}`);
    return { success: true, message: 'qevlarConfig.json updated successfully' };
  } catch (err) {
    console.error('Error writing config:', err);
    return { success: false, message: 'Error writing qevlarConfig.json', error: err };
  }
};


const getSchema = async (url) => {
  try {
    config.API_URL = url;

    // Fetch GraphQL schema
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: introspectionQuery }),
    });
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    const data = await res.json();

    // Set top-level and sub-fields
    getTopAndSubField(data);

    // Fetch a valid ID for ANY_TOP_LEVEL_FIELD_ID
    const topId = await fetchTopLevelId(url, config.TOP_LEVEL_FIELD);
    config.ANY_TOP_LEVEL_FIELD_ID = topId || "1"; // fallback to "1"

    // Save updated config
    const modifyResult = await modifyConfig();

    return modifyResult;
  } catch (err) {
    return { success: false, message: 'Error fetching schema', error: err.message };
  }
};

module.exports = getSchema;
