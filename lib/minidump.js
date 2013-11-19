var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

var searchPaths = [
  path.resolve(__dirname, '..', 'build', 'Release'),
  path.resolve(__dirname, '..', 'build', 'Debug'),
  path.resolve(__dirname, '..', 'bin'),
];
function findMinidumpProcessorPath() {
  for (var i in searchPaths) {
    var binaryPath = path.join(searchPaths[i], 'minidump_stackwalk');
    if (fs.existsSync(binaryPath))
      return binaryPath;
  }
}

var globalSymbolPaths = [];
module.exports.addSymbolPath = Array.prototype.push.bind(globalSymbolPaths);

module.exports.walkStack = function (minidump, symbolPaths, callback) {
  if (!callback) {
    callback = symbolPaths;
    symbolPaths = [];
  }

  var minidumpProcessorPath = findMinidumpProcessorPath();
  if (!minidumpProcessorPath) {
    callback('Unable to find the "minidump_stackwalk"');
    return;
  }

  var stderr = '';
  var stdout = '';
  var child = spawn(minidumpProcessorPath, [minidump].concat(symbolPaths, globalSymbolPaths));
  child.stdout.on('data', function (chunk) { stdout += chunk; });
  child.stderr.on('data', function (chunk) { stderr += chunk; });
  child.on('close', function (code) {
    if (code != 0)
      callback(stderr);
    else
      callback(null, stdout);
  });
}
