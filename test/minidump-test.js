var assert = require('assert')
var path = require('path')

var minidump = require('..')
var electronDownload = require('electron-download')
var extractZip = require('extract-zip')
var temp = require('temp').track()

var downloadElectronSymbols = function (platform, callback) {
 var symbolsPath = temp.mkdirSync('node-minidump-')

 electronDownload({
   version: '1.4.3',
   platform: platform,
   symbols: true,
   quiet: true
 }, function (error, zipPath) {
   if (error) return callback(error)
   extractZip(zipPath, {dir: symbolsPath}, function (error) {
     if (error) return callback(error)
     minidump.addSymbolPath(path.join(symbolsPath, 'electron.breakpad.syms'))
     callback()
   })
 })
}

describe('minidump', function () {
  this.timeout(60000)

  describe('walkStack()', function () {
    describe('macOS dump', function () {
      before(function (done) {
        downloadElectronSymbols('darwin', done)
      })

      it('calls back with a report', function (done) {
        minidump.walkStack(path.join(__dirname, 'fixtures', 'mac.dmp'), function (error, report) {
          if (error) return done(error)

          report = report.toString()
          assert.notEqual(report.indexOf('Electron Framework!atom::(anonymous namespace)::Crash() [atom_bindings.cc : 27 + 0x0]'), -1)
          done()
        })
      })
    })

    describe('Windows dump', function () {
      before(function (done) {
        downloadElectronSymbols('win32', done)
      })

      it('calls back with a report', function (done) {
        minidump.walkStack(path.join(__dirname, 'fixtures', 'windows.dmp'), function (error, report) {
          if (error) return done(error)

          report = report.toString()
          assert.notEqual(report.indexOf('electron.exe!atom::`anonymous namespace\'::Crash [atom_bindings.cc : 27 + 0x0]'), -1)
          done()
        })
      })
    })
  })
})
