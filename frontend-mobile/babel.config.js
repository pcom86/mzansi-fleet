module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      web: {
        plugins: ['react-native-web'],
      },
    },
  };
};
