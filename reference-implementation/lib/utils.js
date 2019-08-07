'use strict';
const { URL } = require('url');

// https://fetch.spec.whatwg.org/#fetch-scheme
const FETCH_SCHEMES = new Set(['http', 'https', 'ftp', 'about', 'blob', 'data', 'file', 'filesystem']);

// Tentative, so better to centralize so we can change in one place as necessary (including tests).
exports.BUILT_IN_MODULE_SCHEME = 'std';

// Useful for comparing to .protocol
exports.BUILT_IN_MODULE_PROTOCOL = `${exports.BUILT_IN_MODULE_SCHEME}:`;

exports.tryURLParse = (string, baseURL) => {
  try {
    return new URL(string, baseURL);
  } catch (e) { // TODO remove useless binding when ESLint and Jest support that
    return null;
  }
};

exports.tryURLLikeSpecifierParse = (specifier, baseURL) => {
  if (specifier === '') {
    console.warn(`Invalid empty string specifier.`);
    return { type: 'invalid' };
  }

  if (specifier.startsWith('/') || specifier.startsWith('./') || specifier.startsWith('../')) {
    if ('data:' === baseURL.protocol) {
      console.warn(`Path-based module specifier ${JSON.stringify(specifier)} cannot be used with a base URL that uses the "data:" scheme.`);
      return { type: 'invalid' };
    }
    return { type: 'url', specifier: new URL(specifier, baseURL).href, isBuiltin: false };
  }

  const url = exports.tryURLParse(specifier);

  if (url === null) {
    return { type: 'nonURL', specifier };
  }

  if (exports.hasFetchScheme(url)) {
    return { type: 'url', specifier: url.href, isBuiltin: false };
  }

  if (url.protocol === exports.BUILT_IN_MODULE_PROTOCOL) {
    if (url.href.includes('/')) {
      console.warn(`Invalid address "${url.href}". Built-in module URLs must not contain "/".`);
      return { type: 'invalid' };
    }
    return { type: 'url', specifier: url.href, isBuiltin: true };
  }

  return { type: 'nonURL', specifier };
};

exports.hasFetchScheme = url => {
  return FETCH_SCHEMES.has(url.protocol.slice(0, -1));
};
