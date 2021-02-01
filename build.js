const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')

const exe = process.platform === 'win32' ? '.exe' : ''
const binDir = path.join(__dirname, 'bin', `${process.platform}-${process.arch}`)

const minidumpStackwalkDest = path.join(binDir, 'minidump_stackwalk') + exe
const minidumpDumpDest = path.join(binDir, 'minidump_dump') + exe
const dumpSymsDest = path.join(binDir, 'dump_syms') + exe

// do not build if executables already exist
if (
  fs.existsSync(minidumpStackwalkDest) &&
  fs.existsSync(minidumpDumpDest) &&
  fs.existsSync(dumpSymsDest)
) {
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

// copy to bin folder
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true })
}

const minidumpStackwalk = path.resolve(__dirname, 'build', 'src', 'processor', 'minidump_stackwalk') + exe
fs.copyFileSync(minidumpStackwalk, minidumpStackwalkDest)
fs.chmodSync(minidumpStackwalkDest, 0o755)

const minidumpDump = path.resolve(__dirname, 'build', 'src', 'processor', 'minidump_dump') + exe
fs.copyFileSync(minidumpDump, minidumpDumpDest)
fs.chmodSync(minidumpDumpDest, 0o755)

const dumpSyms = (() => {
  if (process.platform === 'darwin') {
    return path.resolve(__dirname, 'deps', 'breakpad', 'src', 'tools', 'mac', 'dump_syms', 'build', 'Release', 'dump_syms')
  } else if (process.platform === 'linux') {
    return path.resolve(__dirname, 'build', 'src', 'tools', 'linux', 'dump_syms', 'dump_syms')
  }
})()
fs.copyFileSync(dumpSyms, dumpSymsDest)
fs.chmodSync(dumpSymsDest, 0o755)
