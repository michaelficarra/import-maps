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
    return null;
  }

  if (specifier.startsWith('/') || specifier.startsWith('./') || specifier.startsWith('../')) {
    if ('data:' === baseURL.protocol) {
      console.warn(`Path-based module specifier ${JSON.stringify(specifier)} cannot be used with a base URL that uses the "data:" scheme.`);
      return null;
    }
    return exports.tryURLParse(specifier, baseURL);
  }

  const url = exports.tryURLParse(specifier);

  if (url === null) {
    return specifier;
  }

  if (exports.hasFetchScheme(url)) {
    return url;
  }

  if (url.protocol === exports.BUILT_IN_MODULE_PROTOCOL) {
    if (url.href.includes('/')) {
      console.warn(`Invalid address "${url.href}". Built-in module URLs must not contain "/".`);
      return null;
    }
    return url;
  }

  return specifier;
};

exports.hasFetchScheme = url => {
  return FETCH_SCHEMES.has(url.protocol.slice(0, -1));
};
