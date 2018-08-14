var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn

var searchPaths = [
  path.join('/', 'usr', 'local', 'bin')
]

function searchCommand(command) {
  if (process.platform == 'win32') {
    command += '.exe'
    var binaryPath = path.join(__dirname, '..', 'deps', 'breakpad', command)
    if (fs.existsSync(binaryPath))
      return binaryPath
  } else {
    for (var i in searchPaths) {
      var binaryPath = path.join(searchPaths[i], command)
      if (fs.existsSync(binaryPath)) {
        return binaryPath
      }
    }
  }
}

function execute(command, args, callback) {
  var stdout = new Buffer(0)
  var stderr = new Buffer(0)
  var child = spawn(command, args)
  child.stdout.on('data', function(chunk) {
    stdout = Buffer.concat([stdout, chunk])
  })
  child.stderr.on('data', function(chunk) {
    stderr = Buffer.concat([stderr, chunk])
  })
  child.on('close', function(code) {
    if (code != 0) {
      callback(stderr ? new Error(stderr.toString()) : new Error("Command `" + command + "` failed: " + code))
    } else {
      callback(null, stdout)
    }
  })
}

var globalSymbolPaths = []

module.exports = {
  addSymbolPath: Array.prototype.push.bind(globalSymbolPaths),

  walkStack: function (minidump, symbolPaths, callback, options) {
    options = options || {}

    if (!symbolPaths) {
      symbolPaths = []
    }

    var stackwalk = searchCommand('minidump_stackwalk')
    if (!stackwalk) {
      callback('Unable to find the "minidump_stackwalk". It should be accessible in /usr/local/bin')
      return
    }

    args = [minidump].concat(symbolPaths, globalSymbolPaths)
    if (options.machine) {
      args.unshift('-m')
    }

    execute(stackwalk, args, callback)
  },

  dumpSymbol: function (binary, callback) {
    var dumpsyms = searchCommand('dump_syms')
    if (!dumpsyms) {
      callback('Unable to find the "dump_syms"')
      return
    }

    // Search for binary.dSYM on OS X.
    dsymPath = binary + '.dSYM'
    if (process.platform == 'darwin' && fs.existsSync(dsymPath)) {
      binary = dsymPath
    }

    execute(dumpsyms, ['-r', '-c', binary], callback)
  }
}
