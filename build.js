const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')

// exe paths
const exe = process.platform === 'win32' ? '.exe' : ''
const minidumpStackwalk = path.resolve(__dirname, 'build', 'src', 'processor', 'minidump_stackwalk') + exe
const minidumpDump = path.resolve(__dirname, 'build', 'src', 'processor', 'minidump_dump') + exe
const dumpSyms = (() => {
  if (process.platform === 'darwin') {
    return path.resolve(__dirname, 'deps', 'breakpad', 'src', 'tools', 'mac', 'dump_syms', 'build', 'Release', 'dump_syms')
  } else if (process.platform === 'linux') {
    return path.resolve(__dirname, 'build', 'src', 'tools', 'linux', 'dump_syms', 'dump_syms')
  }
})()

// do not build if executables already exist
if (fs.existsSync(minidumpStackwalk) && fs.existsSync(minidumpDump) && fs.existsSync(dumpSyms)) {
  process.exit(0)
}

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

spawnSync('make', ['-C', buildDir, '-j', require('os').cpus().length, ...targets], {
  stdio: 'inherit'
})

if (process.platform === 'darwin') {
  spawnSync('xcodebuild', ['-project', path.join(__dirname, 'deps', 'breakpad', 'src', 'tools', 'mac', 'dump_syms', 'dump_syms.xcodeproj'), 'build'], {
    stdio: 'inherit'
  })
}
