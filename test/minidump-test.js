var assert = require('assert')
var path = require('path')

var minidump = require('..')
var electronDownload = require('electron-download')
var extractZip = require('extract-zip')
var temp = require('temp').track()

describe('minidump', function () {
  this.timeout(60000)

  describe('walkStack()', function () {
    describe('macOS dump', function () {
      it('calls back with a report', function (done) {
        downloadElectronSymbols('darwin', function (error, symbolsPath) {
          if (error) return done(error)

          var dumpPath = path.join(__dirname, 'fixtures', 'mac.dmp')
          minidump.walkStack(dumpPath, symbolsPath, function (error, report) {
            if (error) return done(error)

            report = report.toString()
            assert.notEqual(report.length, 0)
            assert.notEqual(report.indexOf('Electron Framework!atom::(anonymous namespace)::Crash() [atom_bindings.cc : 27 + 0x0]'), -1)
            done()
          })
        })
      })
    })

    describe('Windows dump', function () {
      it('calls back with a report', function (done) {
        downloadElectronSymbols('win32', function (error, symbolsPath) {
          if (error) return done(error)

          var dumpPath = path.join(__dirname, 'fixtures', 'windows.dmp')
          minidump.walkStack(dumpPath, symbolsPath, function (error, report) {
            if (error) return done(error)

            report = report.toString()
            assert.notEqual(report.length, 0)
            assert.notEqual(report.indexOf('electron.exe!atom::`anonymous namespace\'::Crash [atom_bindings.cc : 27 + 0x0]'), -1)
            done()
          })
        })
      })
    })
  })
})

var downloadElectronSymbols = function (platform, callback) {
  electronDownload({
    version: '1.4.3',
    platform: platform,
    symbols: true,
    quiet: true
  }, function (error, zipPath) {
    if (error) return callback(error)

    var symbolsPath = temp.mkdirSync('node-minidump-')
    extractZip(zipPath, {dir: symbolsPath}, function (error) {
      if (error) return callback(error)
      callback(null, path.join(symbolsPath, 'electron.breakpad.syms'))
   })
  })
}
