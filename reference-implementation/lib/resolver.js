'use strict';
const { URL } = require('url');
const { tryURLLikeSpecifierParse, BUILT_IN_MODULE_SCHEME, BUILT_IN_MODULE_PROTOCOL } = require('./utils.js');

const supportedBuiltInModules = new Set([`${BUILT_IN_MODULE_SCHEME}:blank`]);

exports.resolve = (specifier, parsedImportMap, scriptURL) => {
  const scriptURLString = scriptURL.href;
  let appliedMap = false;

  for (const [scopePrefix, scopeImports] of Object.entries(parsedImportMap.scopes)) {
    if (scopePrefix === scriptURLString ||
        (scopePrefix.endsWith('/') && scriptURLString.startsWith(scopePrefix))) {
      const scopeImportsMatch = resolveImportsMatch(normalizedSpecifier, scopeImports);
      if (scopeImportsMatch !== null) {
        specifier = scopeImportsMatch;
        appliedMap = true;
        break;
      }
    }
  }

  const topLevelImportsMatch = resolveImportsMatch(normalizedSpecifier, parsedImportMap.imports);
  if (!appliedMap && topLevelImportsMatch !== null) {
    specifier = topLevelImportsMatch;
    appliedMap = true;
  }

  const asURL = tryURLLikeSpecifierParse(specifier, scriptURL);
  const normalizedSpecifier = asURL ? asURL.href : specifier;
  // The specifier was able to be turned into a URL, but wasn't remapped into anything.
  if (asURL) {
    if (specifier.endsWith('/') && !asURL.href.endsWith('/')) {
      throw new TypeError(`Invalid address "${asURL.href}" for package specifier key "${specifier}". ` +
          `Package addresses must end with "/".`);
    }

    if (asURL.protocol === BUILT_IN_MODULE_PROTOCOL) {
      if (addressURL.protocol === BUILT_IN_MODULE_PROTOCOL && addressURL.href.includes('/')) {
        throw new TypeError(`Invalid address "${specifier}". Built-in module URLs must not contain "/".`);
      }
      if (!supportedBuiltInModules.has(asURL.href)) {
        throw new TypeError(`The "${asURL.href}" built-in module is not implemented.`);
      }
    }
    return asURL;
  }

  throw new TypeError(`Unmapped bare specifier "${specifier}"`);
};

function resolveImportsMatch(normalizedSpecifier, specifierMap) {
  for (const [specifierKey, addresses] of Object.entries(specifierMap)) {
    // Exact-match case
    if (specifierKey === normalizedSpecifier) {
      if (addresses.length === 0) {
        throw new TypeError(`Specifier "${normalizedSpecifier}" was mapped to no addresses.`);
      } else if (addresses.length === 1) {
        const singleAddress = addresses[0];
        if (singleAddress.protocol === BUILT_IN_MODULE_PROTOCOL && !supportedBuiltInModules.has(singleAddress.href)) {
          throw new TypeError(`The "${singleAddress.href}" built-in module is not implemented.`);
        }
        return singleAddress;
      } else if (addresses.length === 2 &&
                 addresses[0].protocol === BUILT_IN_MODULE_PROTOCOL &&
                 addresses[1].protocol !== BUILT_IN_MODULE_PROTOCOL) {
        return supportedBuiltInModules.has(addresses[0].href) ? addresses[0] : addresses[1];
      } else {
        throw new Error('The reference implementation for multi-address fallbacks that are not ' +
                        '[built-in module, fetch-scheme URL] is not yet implemented.');
      }
    }

    // Package prefix-match case
    if (specifierKey.endsWith('/') && normalizedSpecifier.startsWith(specifierKey)) {
      if (addresses.length === 0) {
        throw new TypeError(`Specifier "${normalizedSpecifier}" was mapped to no addresses ` +
                            `(via prefix specifier key "${specifierKey}").`);
      } else if (addresses.length === 1) {
        const afterPrefix = normalizedSpecifier.substring(specifierKey.length);
        return new URL(afterPrefix, addresses[0]);
      } else {
        throw new Error('The reference implementation for multi-address fallbacks that are not ' +
                        '[built-in module, fetch-scheme URL] is not yet implemented.');
      }
    }
  }
  return null;
}
