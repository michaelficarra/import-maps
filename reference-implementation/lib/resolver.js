'use strict';
const { URL } = require('url');
const { tryURLLikeSpecifierParse, BUILT_IN_MODULE_SCHEME, BUILT_IN_MODULE_PROTOCOL } = require('./utils.js');

const supportedBuiltInModules = new Set([`${BUILT_IN_MODULE_SCHEME}:blank`]);

exports.resolve = (specifier, parsedImportMap, scriptURLparameter) => {
  const scriptURL = new URL(scriptURLparameter);

  let asURL = tryURLLikeSpecifierParse(specifier, scriptURL);
  if (asURL === null) {
    throw new TypeError('Attempting to resolve invalid specifier.');
  }
  let normalizedSpecifier = typeof asURL === 'string' ? asURL : asURL.href;

  for (const [scopePrefix, scopeImports] of Object.entries(parsedImportMap.scopes).concat([[scriptURL.href, parsedImportMap.imports]])) {
    if (scopePrefix === scriptURL.href ||
        (scopePrefix.endsWith('/') && scriptURL.href.startsWith(scopePrefix))) {
      const scopeImportsMatch = resolveImportsMatch(normalizedSpecifier, scopeImports, scriptURL);
      if (scopeImportsMatch !== null) {
        asURL = scopeImportsMatch;
        break;
      }
    }
  }

  if (asURL === null || typeof asURL === 'string') {
    throw new TypeError(`Unmapped bare specifier "${specifier}"`);
  }

  if (asURL.protocol === BUILT_IN_MODULE_PROTOCOL && !supportedBuiltInModules.has(asURL.href)) {
    throw new TypeError(`The "${asURL.href}" built-in module is not implemented.`);
  }

  return asURL;
};

function resolveImportsMatch(normalizedSpecifier, specifierMap, scriptURL) {
  for (const [specifierKey, addresses] of Object.entries(specifierMap)) {
    if (specifierKey === normalizedSpecifier) {
      // Exact-match case
      for (const address of addresses) {
        const asURL = tryURLLikeSpecifierParse(address, scriptURL);
        if (asURL === null || typeof asURL === 'string') {
          throw new TypeError(`The specifier ${JSON.stringify(normalizedSpecifier)} was resolved to non-URL ${JSON.stringify(address)}.`);
        }
        if (asURL.protocol !== BUILT_IN_MODULE_PROTOCOL || supportedBuiltInModules.has(asURL.href)) {
          return asURL;
        }
      }
      throw new TypeError(`The specifier ${JSON.stringify(normalizedSpecifier)} could not be resolved.`);
    } else if (specifierKey.endsWith('/') && normalizedSpecifier.startsWith(specifierKey)) {
      // Package prefix-match case
      const afterPrefix = normalizedSpecifier.substring(specifierKey.length);
      for (const address of addresses) {
        try {
          return new URL(afterPrefix, address);
        } catch {
          throw new TypeError(`The specifier ${JSON.stringify(normalizedSpecifier)} was resolved to non-URL ${JSON.stringify(address)}.`);
        }
      }
      throw new TypeError(`The specifier ${JSON.stringify(normalizedSpecifier)} could not be resolved.`);
    }
  }

  return null;
}
