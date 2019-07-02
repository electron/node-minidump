var assert = require('assert')
var path = require('path')

var minidump = require('..')
var electronDownload = require('electron-download')
var extractZip = require('extract-zip')
var temp = require('temp').track()

var describe = global.describe
var it = global.it

describe('minidump', function () {
  this.timeout(3 * 60 * 1000)

  describe('walkStack()', function () {
    describe('macOS dump', function () {
      it('calls back with a report', function (done) {
        downloadElectronSymbols('darwin', function (error, symbolsPath) {
          if (error) return done(error)

          var dumpPath = path.join(__dirname, 'fixtures', 'mac.dmp')
          minidump.walkStack(dumpPath, symbolsPath, function (error, report) {
            if (error) return done(error)

            assert.equal(Buffer.isBuffer(report), true)
            assert.notEqual(report.length, 0)

            report = report.toString()
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

            assert.equal(Buffer.isBuffer(report), true)
            assert.notEqual(report.length, 0)

            report = report.toString()
            assert.notEqual(report.indexOf('electron.exe!atom::`anonymous namespace\'::Crash [atom_bindings.cc : 27 + 0x0]'), -1)
            done()
          })
        })
      })
    })

    describe('Linux dump', function () {
      it('calls back with a report', function (done) {
        downloadElectronSymbols('linux', function (error, symbolsPath) {
          if (error) return done(error)

          var dumpPath = path.join(__dirname, 'fixtures', 'linux.dmp')
          minidump.walkStack(dumpPath, symbolsPath, function (error, report) {
            if (error) return done(error)

            report = report.toString()
            assert.notEqual(report.length, 0)
            assert.notEqual(report.indexOf('electron!Crash [atom_bindings.cc : 27 + 0x0]'), -1)
            done()
          })
        })
      })
    })
  })

  describe('dumpSymbol()', function () {
    it('calls back with a minidump', function (done) {
      if (process.platform !== 'linux') return this.skip()

      downloadElectron(function (error, binaryPath) {
        if (error) return done(error)
        minidump.dumpSymbol(binaryPath, function (error, minidump) {
          if (error) return done(error)

          assert.equal(Buffer.isBuffer(minidump), true)
          assert.notEqual(minidump.length, 0)
          done()
        })
      })
    })
  })

  describe('moduleList()', function () {
    describe('on a Linux dump', () => {
      it('calls back with a module list', function (done) {
        const dumpPath = path.join(__dirname, 'fixtures', 'linux.dmp')
        minidump.moduleList(dumpPath, (err, modules) => {
          if (err) return done(err)
          assert.notEqual(modules.length, 0)
          assert(modules.some(m => m.name.endsWith('/electron')))
          done()
        })
      })
    })

    describe('on a Windows dump', () => {
      it('calls back with a module list', function (done) {
        const dumpPath = path.join(__dirname, 'fixtures', 'windows.dmp')
        minidump.moduleList(dumpPath, (err, modules) => {
          if (err) return done(err)
          assert.notEqual(modules.length, 0)
          assert(modules.some(m => m.name.endsWith('\\electron.exe')))
          done()
        })
      })
    })

    describe('on a macOS dump', () => {
      it('calls back with a module list', function (done) {
        const dumpPath = path.join(__dirname, 'fixtures', 'mac.dmp')
        minidump.moduleList(dumpPath, (err, modules) => {
          if (err) return done(err)
          assert.notEqual(modules.length, 0)
          assert(modules.some(m => m.name.endsWith('/Electron Helper')))
          done()
        })
      })
    })
  })
})

var downloadElectron = function (callback) {
  electronDownload({
    version: '1.4.3',
    arch: 'x64',
    platform: process.platform,
    quiet: true
  }, function (error, zipPath) {
    if (error) return callback(error)

    var electronPath = temp.mkdirSync('node-minidump-')
    extractZip(zipPath, { dir: electronPath }, function (error) {
      if (error) return callback(error)

      if (process.platform === 'darwin') {
        callback(null, path.join(electronPath, 'Electron.app', 'Contents', 'MacOS', 'Electron'))
      } else {
        callback(null, path.join(electronPath, 'electron'))
      }
    })
  })
}

var downloadElectronSymbols = function (platform, callback) {
  electronDownload({
    version: '1.4.3', // Dumps were generated with Electron 1.4.3 x64
    arch: 'x64',
    platform: platform,
    symbols: true,
    quiet: true
  }, function (error, zipPath) {
    if (error) return callback(error)

    var symbolsPath = temp.mkdirSync('node-minidump-')
    extractZip(zipPath, { dir: symbolsPath }, function (error) {
      if (error) return callback(error)
      callback(null, path.join(symbolsPath, 'electron.breakpad.syms'))
    })
  })
}
