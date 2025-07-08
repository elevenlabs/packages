const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for workspace packages
config.watchFolders = [
  ...config.watchFolders,
  // Add the workspace root
  require('node:path').resolve(__dirname, '../../'),
];

module.exports = config;