# minidump - Process minidump files

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/electron/node-minidump/tree/main.svg?style=shield)](https://dl.circleci.com/status-badge/redirect/gh/electron/node-minidump/tree/main)
[![npm version](http://img.shields.io/npm/v/minidump.svg)](https://npmjs.org/package/minidump)

## Installing

```sh
npm install minidump
```

## Building (for development)

* `git clone --recurse-submodules https://github.com/electron/node-minidump`
* `npm install`

## Docs

```javascript
var minidump = require('minidump');
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


## Releasing a new npm version
- Ensure you have checked out the `deps/breakpad` submodule. If you don't check
  this out, then the source code of breakpad will not be included in the npm
  package, and it will not be possible to build from source.
- Change the version in `package.json`, make a new git tag, and push it to GitHub.
- Wait until the CircleCI jobs on the main branch pass.
- The artifacts of the latest CircleCI jobs run should be downloaded and placed under the `bin` folder
  (replacing the old folder if it exists).

	The bin folder should look like the following.
	```
	bin
	 |_linux-x64
		|_dump_syms
		|_minidump_dump
		|_minidump_stackwalk
	 |_darwin-x64
		|_dump_syms
		|_minidump_dump
		|_minidump_stackwalk
	```

- Then:
	```
	npm publish
	```
