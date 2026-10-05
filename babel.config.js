const { readPublicEnv, inlinePublicEnv } = require('./scripts/public-env.cjs');

module.exports = function (api) {
  const testing = api.env('test');
  const values = testing ? {} : JSON.parse(api.cache.using(() => JSON.stringify(readPublicEnv(__dirname))));
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: testing ? [] : [[inlinePublicEnv, { values }]],
  };
};
