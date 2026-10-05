const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');

const PUBLIC_KEYS = ['VIRALCO_API_URL', 'VIRALCO_DEBUG_LOGIN_PRESETS'];

function readPublicEnv(root, environment = process.env) {
  let values = {};
  for (const name of ['.env', '.env.local']) {
    const file = path.join(root, name);
    if (fs.existsSync(file)) Object.assign(values, parseEnv(fs.readFileSync(file, 'utf8')));
  }
  Object.assign(values, environment);
  const result = Object.fromEntries(PUBLIC_KEYS.map(key => [key, String(values[key] == null ? '' : values[key]).trim()]));
  const address = result.VIRALCO_API_URL.replace(/\/+$/, '');
  if (address) {
    const url = new URL(address);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('VIRALCO_API_URL debe ser el origen HTTP(S) del backend, sin /api, credenciales ni parametros. Solicita el .env.local a Andres Manrique.');
    }
  }
  result.VIRALCO_API_URL = address;
  return result;
}

function inlinePublicEnv({ types }) {
  return {
    visitor: {
      MemberExpression(nodePath, state) {
        const node = nodePath.node;
        if (!node.computed && types.isIdentifier(node.property) && PUBLIC_KEYS.includes(node.property.name)
          && types.isMemberExpression(node.object) && !node.object.computed
          && types.isIdentifier(node.object.object, { name: 'process' }) && types.isIdentifier(node.object.property, { name: 'env' })) {
          nodePath.replaceWith(types.stringLiteral(state.opts.values[node.property.name] || ''));
        }
      },
    },
  };
}

module.exports = { readPublicEnv, inlinePublicEnv };
