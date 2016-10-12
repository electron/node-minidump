var assert = require('assert')
var path = require('path')

var minidump = require('..')
var electronDownload = require('electron-download')
var extractZip = require('extract-zip')
var temp = require('temp').track()

describe('minidump', function () {
  this.timeout(60000)

  before(function (done) {
    var symbolsPath = temp.mkdirSync('node-minidump-')

    electronDownload({
      version: '1.4.3',
      symbols: true,
      quiet: true
    }, function (error, zipPath) {
      if (error) return done(error)
      extractZip(zipPath, {dir: symbolsPath}, function (error) {
        if (error) return done(error)
        minidump.addSymbolPath(path.join(symbolsPath, 'electron.breakpad.syms'))
        done()
      })
    })
  })

  describe('walkStack()', function () {
    it('calls back with a report that includes symbols', function (done) {
      minidump.walkStack(path.join(__dirname, 'fixtures', 'dump-mac'), function (error, report) {
        if (error) return done(error)

        report = report.toString()
        assert.notEqual(report.indexOf('Electron Framework!atom::(anonymous namespace)::Crash() [atom_bindings.cc : 27 + 0x0]'), -1)
        done()
      })
    })
  })
})
