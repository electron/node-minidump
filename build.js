const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')

function spawnSync (...args) {
  const result = childProcess.spawnSync(...args)
  if (result.status !== 0) {
    process.exit(result.status)
  }
}

const buildDir = path.join(__dirname, 'build')
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true })
}

spawnSync(path.join(__dirname, 'deps', 'breakpad', 'configure'), [], {
  cwd: buildDir,
  env: {
    ...process.env,
    CPPFLAGS: `-I${path.relative(buildDir, path.join(__dirname, 'deps'))}`
  },
  stdio: 'inherit'
})
const targets = ['src/processor/minidump_stackwalk', 'src/processor/minidump_dump']
if (process.platform === 'linux') {
  targets.push('src/tools/linux/dump_syms/dump_syms')
}

spawnSync('make', [includes, '-C', buildDir, '-j', require('os').cpus().length, ...targets], {
  stdio: 'inherit'
})

if (process.platform === 'darwin') {
  spawnSync('xcodebuild', ['-project', path.join(__dirname, 'deps', 'breakpad', 'src', 'tools', 'mac', 'dump_syms', 'dump_syms.xcodeproj'), 'build'], {
    stdio: 'inherit'
  })
}
