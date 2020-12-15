const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const buildDir = path.join(__dirname, 'build')
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true })
}

let includes = `-I${path.relative(buildDir, path.join(__dirname, 'deps'))}`
if (process.platform === 'darwin') {
  // needed for `#include "common/*.h"` in `src/tools/mac/dump_syms/dump_syms_tool`
  includes = includes + ` -I${path.relative(buildDir, path.join(__dirname, 'deps', 'breakpad', 'src'))}`
}

spawnSync(path.join(__dirname, 'deps', 'breakpad', 'configure'), [], {
  cwd: buildDir,
  env: {
    ...process.env,
    CPPFLAGS: includes
  },
  stdio: 'inherit'
})
const targets = ['src/processor/minidump_stackwalk', 'src/processor/minidump_dump']
if (process.platform === 'linux') {
  targets.push('src/tools/linux/dump_syms/dump_syms')
}
if (process.platform === 'darwin') {
  targets.push('src/tools/mac/dump_syms/dump_syms_tool')
}

spawnSync('make', [includes, '-C', buildDir, '-j', require('os').cpus().length, ...targets], {
  stdio: 'inherit'
})
