'use strict';
const { URL } = require('url');
const { tryURLLikeSpecifierParse, BUILT_IN_MODULE_SCHEME, BUILT_IN_MODULE_PROTOCOL } = require('./utils.js');

const supportedBuiltInModules = new Set([`${BUILT_IN_MODULE_SCHEME}:blank`]);

exports.resolve = (specifier, parsedImportMap, scriptURLparameter) => {
  const scriptURL = new URL(scriptURLparameter);

  let asURL = tryURLLikeSpecifierParse(specifier, scriptURL);
  if (asURL.type === 'invalid') {
    throw new TypeError('Attempting to resolve invalid specifier.');
  }

  for (const [scopePrefix, scopeImports] of Object.entries(parsedImportMap.scopes).concat([[scriptURL.href, parsedImportMap.imports]])) {
    if (scopePrefix === scriptURL.href ||
        (scopePrefix.endsWith('/') && scriptURL.href.startsWith(scopePrefix))) {
      const scopeImportsMatch = resolveImportsMatch(asURL.specifier, scopeImports, scriptURL);
      if (scopeImportsMatch !== null) {
        return scopeImportsMatch;
      }
    }
  }

  if (asURL.type !== 'url') {
    throw new TypeError(`Unmapped bare specifier "${specifier}"`);
  }

  if (asURL.isBuiltin && !supportedBuiltInModules.has(asURL.specifier)) {
    throw new TypeError(`The "${asURL.specifier}" built-in module is not implemented.`);
  }

  return new URL(asURL.specifier);
};

function resolveImportsMatch(normalizedSpecifier, specifierMap, scriptURL) {
  for (const [specifierKey, addresses] of Object.entries(specifierMap)) {
    if (specifierKey === normalizedSpecifier) {
      // Exact-match case
      for (const address of addresses) {
        const asURL = tryURLLikeSpecifierParse(address, scriptURL);
        if (asURL.type !== 'url') {
          throw new TypeError(`The specifier ${JSON.stringify(normalizedSpecifier)} was resolved to non-URL ${JSON.stringify(address)}.`);
        }
        if (!asURL.isBuiltin || supportedBuiltInModules.has(asURL.specifier)) {
          return new URL(asURL.specifier);
        }
      }
      throw new TypeError(`The specifier ${JSON.stringify(normalizedSpecifier)} could not be resolved.`);
    } else if (specifierKey.endsWith('/') && normalizedSpecifier.startsWith(specifierKey)) {
      // Package prefix-match case
      const afterPrefix = normalizedSpecifier.substring(specifierKey.length);
      for (const address of addresses) {
        try {
          const resolved = new URL(afterPrefix, address);
          if (resolved.protocol !== BUILT_IN_MODULE_PROTOCOL || supportedBuiltInModules.has(resolved.href)) {
            return resolved;
          }
        } catch {
          throw new TypeError(`The specifier ${JSON.stringify(normalizedSpecifier)} was resolved to non-URL ${JSON.stringify(address)}.`);
        }
      }
      throw new TypeError(`The specifier ${JSON.stringify(normalizedSpecifier)} could not be resolved.`);
    }
  }

  return null;
}
