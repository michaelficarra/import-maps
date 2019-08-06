'use strict';
const { URL } = require('url');
const { tryURLLikeSpecifierParse, BUILT_IN_MODULE_SCHEME, BUILT_IN_MODULE_PROTOCOL } = require('./utils.js');

const supportedBuiltInModules = new Set([`${BUILT_IN_MODULE_SCHEME}:blank`]);

exports.resolve = (specifier, parsedImportMap, scriptURL) => {
  const scriptURLString = scriptURL.href;

  for (const [scopePrefix, scopeImports] of Object.entries(parsedImportMap.scopes).concat([[scriptURLString, parsedImportMap.imports]])) {
    if (scopePrefix === scriptURLString ||
        (scopePrefix.endsWith('/') && scriptURLString.startsWith(scopePrefix))) {
      const scopeImportsMatch = resolveImportsMatch(specifier, scopeImports, scriptURL);
      console.log(specifier);
      console.log(scopeImports);
      console.log(scriptURL);
      console.log(scopeImportsMatch);
      if (scopeImportsMatch !== null) {
        specifier = scopeImportsMatch.href;
        break;
      }
    }
  }

  const asURL = tryURLLikeSpecifierParse(specifier, scriptURL);
  if (asURL === null) {
    throw new TypeError(`Unmapped bare specifier "${specifier}"`);
  }

  if (specifier.endsWith('/') && !asURL.href.endsWith('/')) {
    throw new TypeError(`Invalid address "${asURL.href}" for package specifier key "${specifier}". ` +
        `Package addresses must end with "/".`);
  }

  if (asURL.protocol === BUILT_IN_MODULE_PROTOCOL) {
    if (asURL.href.includes('/')) {
      throw new TypeError(`Invalid address "${asURL.href}". Built-in module URLs must not contain "/".`);
    }
    if (!supportedBuiltInModules.has(asURL.href)) {
      throw new TypeError(`The "${asURL.href}" built-in module is not implemented.`);
    }
  }

  return asURL;
};

function resolveImportsMatch(normalizedSpecifier, specifierMap, scriptURL) {
  for (const [specifierKey, addresses] of Object.entries(specifierMap)) {
    // Exact-match case
    if (specifierKey === normalizedSpecifier) {
      for (const address of addresses) {
        const asURL = tryURLLikeSpecifierParse(address, scriptURL);
        if (asURL === null) {
          throw new TypeError(`The specifier ${JSON.stringify(normalizedSpecifier)} was resolved to non-URL ${JSON.stringify(address)}.`);
        }
        if (asURL.protocol !== BUILT_IN_MODULE_PROTOCOL || supportedBuiltInModules.has(asURL.href)) {
          return asURL;
        }
      }
    }

    // Package prefix-match case
    if (specifierKey.endsWith('/') && normalizedSpecifier.startsWith(specifierKey)) {
      const afterPrefix = normalizedSpecifier.substring(specifierKey.length);
      for (const address of addresses) {
        try {
          return new URL(afterPrefix, address);
        } catch {
          throw new TypeError(`The specifier ${JSON.stringify(normalizedSpecifier)} was resolved to non-URL ${JSON.stringify(address)}.`);
        }
      }
    }
  }

  return null;
}
