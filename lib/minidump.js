var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn

const exe = process.platform === 'win32' ? '.exe' : ''
const commands = {
  minidump_stackwalk: path.resolve(__dirname, '..', 'build', 'src', 'processor', 'minidump_stackwalk') + exe,
  dump_syms: (() => {
    if (process.platform === 'darwin') {
      return path.resolve(__dirname, '..', 'build', 'src', 'tools', 'mac', 'dump_syms', 'dump_syms_mac')
    } else if (process.platform === 'linux') {
      return path.resolve(__dirname, '..', 'build', 'src', 'tools', 'linux', 'dump_syms', 'dump_syms')
    }
  })()
}

function execute (command, args, callback) {
  var stdout = Buffer.alloc(0)
  var stderr = Buffer.alloc(0)
  var child = spawn(command, args)
  child.stdout.on('data', function (chunk) {
    stdout = Buffer.concat([stdout, chunk])
  })
  child.stderr.on('data', function (chunk) {
    stderr = Buffer.concat([stderr, chunk])
  })
  child.on('close', function (code) {
    if (code !== 0) {
      callback(stderr ? new Error(stderr.toString()) : new Error('Command `' + command + '` failed: ' + code))
    } else {
      callback(null, stdout)
    }
  })
}

var globalSymbolPaths = []
module.exports.addSymbolPath = Array.prototype.push.bind(globalSymbolPaths)

module.exports.walkStack = function (minidump, symbolPaths, callback, commandArgs) {
  if (!callback) {
    callback = symbolPaths
    symbolPaths = []
  }

  var stackwalk = commands.minidump_stackwalk
  if (!stackwalk) {
    callback(new Error('Unable to find "minidump_stackwalk"'))
    return
  }

  var args = [minidump].concat(symbolPaths, globalSymbolPaths)
  args = commandArgs ? [commandArgs].concat(args) : args
  execute(stackwalk, args, callback)
}

module.exports.dumpSymbol = function (binary, callback) {
  var dumpsyms = commands.dump_syms
  if (!dumpsyms) {
    callback(new Error('Unable to find "dump_syms"'))
    return
  }

  // Search for binary.dSYM on OS X.
  var dsymPath = binary + '.dSYM'
  if (process.platform === 'darwin' && fs.existsSync(dsymPath)) {
    binary = dsymPath
  }

  execute(dumpsyms, ['-r', '-c', binary], callback)
}
