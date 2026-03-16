const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add buffer module resolution
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  buffer: 'buffer',
};

// Fix web platform bundling issues
config.resolver.platforms = ['ios', 'android', 'web', 'native'];

// Configure resolver for web
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  'react-native$': 'react-native-web',
};

// Simple transformer config
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
