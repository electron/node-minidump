var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

var searchPaths = [
  path.resolve(__dirname, '..', 'build', 'Release'),
  path.resolve(__dirname, '..', 'build', 'Debug'),
  path.resolve(__dirname, '..', 'bin'),
];
function searchCommand(command) {
  if (process.platform == 'win32') {
    command += '.exe'
    var binaryPath = path.join(__dirname, '..', 'deps', 'breakpad', command)
    if (fs.existsSync(binaryPath))
      return binaryPath;
  } else {
    for (var i in searchPaths) {
      var binaryPath = path.join(searchPaths[i], command);
      if (fs.existsSync(binaryPath))
        return binaryPath;
    }
  }
}

function execute(command, args, callback) {
  var stdout = new Buffer(0);
  var stderr = new Buffer(0);
  var child = spawn(command, args);
  child.stdout.on('data', function(chunk) {
    stdout = Buffer.concat([stdout, chunk]);
  });
  child.stderr.on('data', function(chunk) {
    stderr = Buffer.concat([stderr, chunk]);
  });
  child.on('close', function(code) {
    if (code != 0)
      callback(stderr ? new Error(stderr.toString()) : new Error("Command `" + command + "` failed: " + code));
    else
      callback(null, stdout);
  });
}

var globalSymbolPaths = [];
module.exports.addSymbolPath = Array.prototype.push.bind(globalSymbolPaths);

module.exports.walkStack = function(minidump, symbolPaths, callback) {
  if (!callback) {
    callback = symbolPaths;
    symbolPaths = [];
  }

  var stackwalk = searchCommand('minidump_stackwalk');
  if (!stackwalk) {
    callback('Unable to find the "minidump_stackwalk"');
    return;
  }

  args = [minidump].concat(symbolPaths, globalSymbolPaths)
  execute(stackwalk, args, callback);
}

module.exports.dumpSymbol = function(binary, callback) {
  var args = [];
  var dumpsyms = searchCommand('dump_syms');
  if (!dumpsyms) {
    callback('Unable to find the "dump_syms"');
    return;
  }

  // Search for binary.dSYM on OS X.
  dsymPath = binary + '.dSYM';
  if (process.platform == 'darwin' && fs.existsSync(dsymPath)) {
    binary = dsymPath;
  }

  if (process.platform !== 'win32') {
    args.push('-r', '-c');
  }

  args.push(binary);

  execute(dumpsyms, args, callback)
}
