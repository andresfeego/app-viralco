const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest(context, moduleName, platform) {
      // Mobile only compares server-generated bcrypt verifiers. bcrypt's Node
      // crypto fallback is for salt generation, which remains server-only.
      if (moduleName === 'crypto' && context.originModulePath.includes('/node_modules/bcryptjs/')) return { type: 'empty' };
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
