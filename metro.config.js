const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package exports resolution for subpath exports like @noble/hashes & @noble/ciphers
config.resolver.unstable_enablePackageExports = true;

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@noble/hashes/crypto.js') {
    return context.resolveRequest(context, '@noble/hashes/crypto', platform);
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
