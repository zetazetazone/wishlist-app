const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Enhanced Metro config for better bundling reliability
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];
config.transformer.minifierPath = 'metro-minify-terser';
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Reset cache on startup to prevent stale cache issues
config.resetCache = true;

module.exports = withNativeWind(config, { input: './app/global.css' });
