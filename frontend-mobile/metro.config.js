const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add buffer module resolution
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  buffer: 'buffer',
};

// Simple transformer config
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
