const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')
const { getEffectiveArch } = require('./lib/arch')

const exe = process.platform === 'win32' ? '.exe' : ''
const binDir = path.join(__dirname, 'bin', `${process.platform}-${getEffectiveArch()}`)

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
  if (result.error) throw result.error
  if (result.status !== 0) {
    process.exit(result.status)
  }
}

if (fs.existsSync(path.join(__dirname, '.git'))) {
  // this is a development working tree of `node-minidump`, not an end-user install of the `minidump` package
  spawnSync('git', ['submodule', 'update', '--init', '--recursive'], {
    cwd: __dirname,
    stdio: 'inherit'
  })
}

const buildDir = path.join(__dirname, 'build', getEffectiveArch())
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true })
}

let overrideArch = ''
let crossCompileHost = ''
if (getEffectiveArch() !== process.arch && process.platform === 'darwin') {
  overrideArch = getEffectiveArch() === 'arm64' ? 'arm64' : 'x86_64'
  crossCompileHost = 'x86_64-apple-darwin20.6.0'
}

spawnSync(path.join(__dirname, 'deps', 'breakpad', 'configure'), crossCompileHost ? [`--host=${crossCompileHost}`] : [], {
  cwd: buildDir,
  env: {
    ...process.env,
    CPPFLAGS: [`-I${path.relative(buildDir, path.join(__dirname, 'deps'))}`, ...(overrideArch ? [`-arch ${overrideArch}`] : [])].join(' '),
    LDFLAGS: overrideArch ? `-arch ${overrideArch}` : undefined
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

const minidumpStackwalk = path.resolve(buildDir, 'src', 'processor', 'minidump_stackwalk') + exe
fs.copyFileSync(minidumpStackwalk, minidumpStackwalkDest)

const minidumpDump = path.resolve(buildDir, 'src', 'processor', 'minidump_dump') + exe
fs.copyFileSync(minidumpDump, minidumpDumpDest)

const dumpSyms = (() => {
  if (process.platform === 'darwin') {
    return path.resolve(__dirname, 'deps', 'breakpad', 'src', 'tools', 'mac', 'dump_syms', 'build', 'Release', 'dump_syms')
  } else if (process.platform === 'linux') {
    return path.resolve(buildDir, 'src', 'tools', 'linux', 'dump_syms', 'dump_syms')
  }
})()
fs.copyFileSync(dumpSyms, dumpSymsDest)

fs.readdirSync(binDir).forEach(file => {
  const absFile = path.join(binDir, file)
  stripBin(absFile)
  maybeSignBin(absFile)
})

function stripBin (file) {
  return childProcess.execFileSync(process.env.STRIP || 'strip', [file, process.platform === 'darwin' ? '-Sx' : '--strip-all'])
}

function maybeSignBin (file) {
  if (process.platform !== 'darwin') return

  return childProcess.execFileSync('codesign', ['--sign', '-', '--force', '--preserve-metadata=entitlements,requirements,flags,runtime', file])
}
