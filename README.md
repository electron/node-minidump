# minidump - Process minidump files

[![Test](https://github.com/electron/node-minidump/actions/workflows/test.yml/badge.svg)](https://github.com/electron/node-minidump/actions/workflows/test.yml)
[![npm version](http://img.shields.io/npm/v/minidump.svg)](https://npmjs.org/package/minidump)

## Installing

```sh
npm install minidump
```

## Building (for development)

`minidump` includes [`breakpad`](https://chromium.googlesource.com/breakpad/breakpad) as a git submodule.

* `git clone --recurse-submodules https://github.com/electron/node-minidump`
* `yarn install`

## Docs

This package is

```javascript
import * as minidump from 'minidump';
```

### minidump.addSymbolPath(path1, ..., pathN)

Add search paths for looking up symbol files.

### minidump.walkStack(minidumpFilePath, [symbolPaths, ]callback)

Get the stack trace from `minidumpFilePath`, the `callback` would be called
with `callback(error, report)` upon completion.

### minidump.dump(minidumpFilePath, callback)

Parse and dump the raw contents of the minidump as text using `minidump_dump`.

### minidump.dumpSymbol(binaryPath, callback)

Dump debug symbols in minidump format from `binaryPath`, the `callback` would
be called with `callback(error, minidump)` upon completion.
