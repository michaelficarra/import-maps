'use strict';
const { expectSpecifierMap } = require('./helpers/parsing.js');
const { BUILT_IN_MODULE_SCHEME } = require('../lib/utils.js');

describe('Relative URL-like addresses', () => {
  it('should accept strings prefixed with ./, ../, or /', () => {
    expectSpecifierMap(
      `{
        "dotSlash": "./foo",
        "dotDotSlash": "../foo",
        "slash": "/foo"
      }`,
      'https://base.example/path1/path2/path3',
      {
        dotSlash: ['https://base.example/path1/path2/foo'],
        dotDotSlash: ['https://base.example/path1/foo'],
        slash: ['https://base.example/foo']
      }
    );
  });

  it('should not accept strings prefixed with ./, ../, or / for data: base URLs', () => {
    expectSpecifierMap(
      `{
        "dotSlash": "./foo",
        "dotDotSlash": "../foo",
        "slash": "/foo"
      }`,
      'data:text/html,test',
      {
        dotSlash: [],
        dotDotSlash: [],
        slash: []
      },
      [
        `Path-based module specifier "./foo" cannot be used with a base URL that uses the "data:" scheme.`,
        `Path-based module specifier "../foo" cannot be used with a base URL that uses the "data:" scheme.`,
        `Path-based module specifier "/foo" cannot be used with a base URL that uses the "data:" scheme.`
      ]
    );
  });

  it('should accept the literal strings ./, ../, or / with no suffix', () => {
    expectSpecifierMap(
      `{
        "dotSlash": "./",
        "dotDotSlash": "../",
        "slash": "/"
      }`,
      'https://base.example/path1/path2/path3',
      {
        dotSlash: ['https://base.example/path1/path2/'],
        dotDotSlash: ['https://base.example/path1/'],
        slash: ['https://base.example/']
      }
    );
  });

  it('should ignore percent-encoded variants of ./, ../, or /', () => {
    expectSpecifierMap(
      `{
        "dotSlash1": "%2E/",
        "dotDotSlash1": "%2E%2E/",
        "dotSlash2": ".%2F",
        "dotDotSlash2": "..%2F",
        "slash2": "%2F",
        "dotSlash3": "%2E%2F",
        "dotDotSlash3": "%2E%2E%2F"
      }`,
      'https://base.example/path1/path2/path3',
      {
        dotSlash1: ['%2E/'],
        dotDotSlash1: ['%2E%2E/'],
        dotSlash2: ['.%2F'],
        dotDotSlash2: ['..%2F'],
        slash2: ['%2F'],
        dotSlash3: ['%2E%2F'],
        dotDotSlash3: ['%2E%2E%2F']
      },
      []
    );
  });
});

describe('Built-in module addresses', () => {
  it('should accept URLs using the built-in module scheme', () => {
    expectSpecifierMap(
      `{
        "foo": "${BUILT_IN_MODULE_SCHEME}:foo"
      }`,
      'https://base.example/path1/path2/path3',
      {
        foo: [`${BUILT_IN_MODULE_SCHEME}:foo`]
      }
    );
  });

  it('should ignore percent-encoded variants of the built-in module scheme', () => {
    expectSpecifierMap(
      `{
        "foo": "${encodeURIComponent(BUILT_IN_MODULE_SCHEME + ':')}foo"
      }`,
      'https://base.example/path1/path2/path3',
      {
        foo: [`${encodeURIComponent(BUILT_IN_MODULE_SCHEME + ':')}foo`]
      },
      []
    );
  });

  it('should ignore and warn on built-in module URLs that contain "/"', () => {
    expectSpecifierMap(
      `{
        "bad1": "${BUILT_IN_MODULE_SCHEME}:foo/",
        "bad2": "${BUILT_IN_MODULE_SCHEME}:foo/bar",
        "good": "${BUILT_IN_MODULE_SCHEME}:foo\\\\baz"
      }`,
      'https://base.example/path1/path2/path3',
      {
        bad1: [],
        bad2: [],
        good: [`${BUILT_IN_MODULE_SCHEME}:foo\\baz`]
      },
      [
        `Invalid address "${BUILT_IN_MODULE_SCHEME}:foo/". Built-in module URLs must not contain "/".`,
        `Invalid address "${BUILT_IN_MODULE_SCHEME}:foo/bar". Built-in module URLs must not contain "/".`
      ]
    );
  });
});

describe('Absolute URL addresses', () => {
  it('should only accept absolute URL addresses with fetch schemes', () => {
    expectSpecifierMap(
      `{
        "about": "about:good",
        "blob": "blob:good",
        "data": "data:good",
        "file": "file:///good",
        "filesystem": "filesystem:good",
        "http": "http://good/",
        "https": "https://good/",
        "ftp": "ftp://good/",
        "import": "import:bad",
        "mailto": "mailto:bad",
        "javascript": "javascript:bad",
        "wss": "wss:bad"
      }`,
      'https://base.example/path1/path2/path3',
      {
        about: ['about:good'],
        blob: ['blob:good'],
        data: ['data:good'],
        file: ['file:///good'],
        filesystem: ['filesystem:good'],
        http: ['http://good/'],
        https: ['https://good/'],
        ftp: ['ftp://good/'],
        import: ['import:bad'],
        mailto: ['mailto:bad'],
        javascript: ['javascript:bad'],
        wss: ['wss:bad']
      },
      []
    );
  });

  it('should only accept absolute URL addresses with fetch schemes inside arrays', () => {
    expectSpecifierMap(
      `{
        "about": ["about:good"],
        "blob": ["blob:good"],
        "data": ["data:good"],
        "file": ["file:///good"],
        "filesystem": ["filesystem:good"],
        "http": ["http://good/"],
        "https": ["https://good/"],
        "ftp": ["ftp://good/"],
        "import": ["import:bad"],
        "mailto": ["mailto:bad"],
        "javascript": ["javascript:bad"],
        "wss": ["wss:bad"]
      }`,
      'https://base.example/path1/path2/path3',
      {
        about: ['about:good'],
        blob: ['blob:good'],
        data: ['data:good'],
        file: ['file:///good'],
        filesystem: ['filesystem:good'],
        http: ['http://good/'],
        https: ['https://good/'],
        ftp: ['ftp://good/'],
        import: ['import:bad'],
        mailto: ['mailto:bad'],
        javascript: ['javascript:bad'],
        wss: ['wss:bad']
      },
      []
    );
  });

  it('should parse absolute URLs, ignoring unparseable ones', () => {
    expectSpecifierMap(
      `{
        "unparseable1": "https://ex ample.org/",
        "unparseable2": "https://example.com:demo",
        "unparseable3": "http://[www.example.com]/",
        "invalidButParseable1": "https:example.org",
        "invalidButParseable2": "https://///example.com///",
        "prettyNormal": "https://example.net",
        "percentDecoding": "https://ex%41mple.com/",
        "noPercentDecoding": "https://example.com/%41"
      }`,
      'https://base.example/path1/path2/path3',
      {
        unparseable1: ['https://ex ample.org/'],
        unparseable2: ['https://example.com:demo'],
        unparseable3: ['http://[www.example.com]/'],
        invalidButParseable1: ['https://example.org/'],
        invalidButParseable2: ['https://example.com///'],
        prettyNormal: ['https://example.net/'],
        percentDecoding: ['https://example.com/'],
        noPercentDecoding: ['https://example.com/%41']
      },
      []
    );
  });

  it('should parse absolute URLs, ignoring unparseable ones inside arrays', () => {
    expectSpecifierMap(
      `{
        "unparseable1": ["https://ex ample.org/"],
        "unparseable2": ["https://example.com:demo"],
        "unparseable3": ["http://[www.example.com]/"],
        "invalidButParseable1": ["https:example.org"],
        "invalidButParseable2": ["https://///example.com///"],
        "prettyNormal": ["https://example.net"],
        "percentDecoding": ["https://ex%41mple.com/"],
        "noPercentDecoding": ["https://example.com/%41"]
      }`,
      'https://base.example/path1/path2/path3',
      {
        unparseable1: ['https://ex ample.org/'],
        unparseable2: ['https://example.com:demo'],
        unparseable3: ['http://[www.example.com]/'],
        invalidButParseable1: ['https://example.org/'],
        invalidButParseable2: ['https://example.com///'],
        prettyNormal: ['https://example.net/'],
        percentDecoding: ['https://example.com/'],
        noPercentDecoding: ['https://example.com/%41']
      },
      []
    );
  });
});

describe('Failing addresses: mismatched trailing slashes', () => {
  it('should warn for the simple case', () => {
    expectSpecifierMap(
      `{
        "trailer/": "/notrailer"
      }`,
      'https://base.example/path1/path2/path3',
      {
        'trailer/': []
      },
      [`Invalid address "https://base.example/notrailer" for package specifier key "trailer/". Package addresses must end with "/".`]
    );
  });

  it('should warn for a mismatch alone in an array', () => {
    expectSpecifierMap(
      `{
        "trailer/": ["/notrailer"]
      }`,
      'https://base.example/path1/path2/path3',
      {
        'trailer/': []
      },
      [`Invalid address "https://base.example/notrailer" for package specifier key "trailer/". Package addresses must end with "/".`]
    );
  });

  it('should warn for a mismatch alongside non-mismatches in an array', () => {
    expectSpecifierMap(
      `{
        "trailer/": ["/atrailer/", "/notrailer"]
      }`,
      'https://base.example/path1/path2/path3',
      {
        'trailer/': ['https://base.example/atrailer/']
      },
      [`Invalid address "https://base.example/notrailer" for package specifier key "trailer/". Package addresses must end with "/".`]
    );
  });
});

describe('Other invalid addresses', () => {
  it('should ignore unprefixed strings that are not absolute URLs', () => {
    for (const bad of ['bar', '\\bar', '~bar', '#bar', '?bar']) {
      expectSpecifierMap(
        `{
          "foo": ${JSON.stringify(bad)}
        }`,
        'https://base.example/path1/path2/path3',
        {
          foo: [bad]
        },
        []
      );
    }
  });
});
