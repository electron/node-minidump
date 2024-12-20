const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const { getEffectiveArch } = require('./arch')
const format = require('./format')

const exe = process.platform === 'win32' ? '.exe' : ''
const binDir = path.join(path.dirname(__dirname), 'bin', `${process.platform}-${getEffectiveArch()}`)

const commands = {
  minidump_stackwalk: path.join(binDir, 'minidump_stackwalk') + exe,
  minidump_dump: path.join(binDir, 'minidump_dump') + exe,
  dump_syms: path.join(binDir, 'dump_syms') + exe
}

function execute (command, args, callback) {
  let called = false
  const origCallback = callback
  callback = function (err, stdout) {
    if (called) {
      return
    }
    called = true
    origCallback(err, stdout)
  }
  let stdout = Buffer.alloc(0)
  let stderr = Buffer.alloc(0)
  const child = spawn(command, args)
  child.stdout.on('data', function (chunk) {
    stdout = Buffer.concat([stdout, chunk])
  })
  child.stderr.on('data', function (chunk) {
    stderr = Buffer.concat([stderr, chunk])
  })
  child.on('close', function (code) {
    if (code !== 0) {
      callback(stderr ? new Error(stderr.toString()) : new Error('Command `' + command + '` failed: ' + code), stdout)
    } else {
      callback(null, stdout)
    }
  })
  child.on('error', function (error) {
    callback(error, stdout)
  })
}

const globalSymbolPaths = []
module.exports.addSymbolPath = Array.prototype.push.bind(globalSymbolPaths)

module.exports.moduleList = function (minidump, callback) {
  fs.readFile(minidump, (err, data) => {
    if (err) return callback(err)
    const { streams } = format.readMinidump(data)
    const moduleList = streams.find(s => s.type === format.streamTypes.MD_MODULE_LIST_STREAM)
    if (!moduleList) return callback(new Error('minidump does not contain module list'))
    const modules = moduleList.modules.map(m => {
      const mod = {
        version: m.version,
        name: m.name
      }
      if (m.cv_record) {
        mod.pdb_file_name = m.cv_record.pdb_file_name
        mod.debug_identifier = m.cv_record.debug_file_id
      }
      return mod
    })
    callback(null, modules)
  })
}

module.exports.walkStack = function (minidump, symbolPaths, callback, commandArgs) {
  if (!callback) {
    callback = symbolPaths
    symbolPaths = []
  }

  const stackwalk = commands.minidump_stackwalk
  if (!stackwalk) {
    callback(new Error('Unable to find "minidump_stackwalk"'))
    return
  }

  let args = [minidump].concat(symbolPaths, globalSymbolPaths)
  args = commandArgs ? [...commandArgs].concat(args) : args
  execute(stackwalk, args, callback)
}

module.exports.dump = function (minidump, callback, commandArgs) {
  execute(commands.minidump_dump, [minidump].concat(commandArgs || []), callback)
}

module.exports.dumpSymbol = function (binary, callback) {
  const dumpsyms = commands.dump_syms
  if (!dumpsyms) {
    callback(new Error('Unable to find "dump_syms"'))
    return
  }

  // Search for binary.dSYM on OS X.
  const dsymPath = binary + '.dSYM'
  if (process.platform === 'darwin' && fs.existsSync(dsymPath)) {
    binary = dsymPath
  }

  execute(dumpsyms, ['-r', '-c', binary], callback)
}
