import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import * as minidump from '../lib/minidump.js';

import { download, downloadArtifact } from '@electron/get';
import extractZip from 'extract-zip';
import temp from 'temp';

temp.track();

const describe = global.describe;
const it = global.it;

describe('minidump', function () {
  this.timeout(3 * 60 * 1000);

  describe('walkStack()', function () {
    describe('macOS dump', function () {
      it('calls back with a report', function (done) {
        downloadElectronSymbols('darwin', function (error, symbolsPath) {
          if (error) return done(error);

          const dumpPath = path.join(import.meta.dirname, 'fixtures', 'mac.dmp');
          minidump.walkStack(dumpPath, symbolsPath, function (error, report) {
            if (error) return done(error);

            assert.equal(Buffer.isBuffer(report), true);
            assert.notEqual(report.length, 0);

            report = report.toString();
            assert.notEqual(
              report.indexOf(
                'Electron Framework!atom::(anonymous namespace)::Crash() [atom_bindings.cc : 27 + 0x0]',
              ),
              -1,
            );
            done();
          });
        });
      });
    });

    describe('Windows dump', function () {
      it('calls back with a report', function (done) {
        downloadElectronSymbols('win32', function (error, symbolsPath) {
          if (error) return done(error);

          const dumpPath = path.join(import.meta.dirname, 'fixtures', 'windows.dmp');
          minidump.walkStack(dumpPath, symbolsPath, function (error, report) {
            if (error) return done(error);

            assert.equal(Buffer.isBuffer(report), true);
            assert.notEqual(report.length, 0);

            report = report.toString();
            assert.notEqual(
              report.indexOf(
                "electron.exe!atom::`anonymous namespace'::Crash [atom_bindings.cc : 27 + 0x0]",
              ),
              -1,
            );
            done();
          });
        });
      });
    });

    describe('Linux dump', function () {
      it('calls back with a report', function (done) {
        downloadElectronSymbols('linux', function (error, symbolsPath) {
          if (error) return done(error);

          const dumpPath = path.join(import.meta.dirname, 'fixtures', 'linux.dmp');
          minidump.walkStack(dumpPath, symbolsPath, function (error, report) {
            if (error) return done(error);

            report = report.toString();
            assert.notEqual(report.length, 0);
            assert.notEqual(report.indexOf('electron!Crash [atom_bindings.cc : 27 + 0x0]'), -1);
            done();
          });
        });
      });
    });
  });

  describe('dumpSymbol()', function () {
    it('calls back with a minidump', function (done) {
      downloadElectron(function (error, binaryPath) {
        if (error) return done(error);
        minidump.dumpSymbol(binaryPath, function (error, minidump) {
          if (error) return done(error);

          assert.equal(Buffer.isBuffer(minidump), true);
          assert.notEqual(minidump.length, 0);
          done();
        });
      });
    });
  });

  describe('dump()', function () {
    it('calls back with minidump info', function (done) {
      minidump.dump(path.join(import.meta.dirname, 'fixtures', 'linux.dmp'), (err, rep) => {
        if (err) {
          // do nothing, errors are fine here
        }
        const report = rep.toString('utf8');
        assert.notEqual(report.length, 0);
        assert.notEqual(report.indexOf('libXss.so.1.0.0'), -1);
        done();
      });
    });
  });

  describe('moduleList()', function () {
    describe('on a Linux dump', () => {
      it('calls back with a module list', function (done) {
        const dumpPath = path.join(import.meta.dirname, 'fixtures', 'linux.dmp');
        minidump.moduleList(dumpPath, (err, modules) => {
          if (err) return done(err);
          assert.notEqual(modules.length, 0);
          assert(modules.some((m) => m.name.endsWith('/electron')));
          done();
        });
      });
    });

    describe('on a Windows dump', () => {
      it('calls back with a module list', function (done) {
        const dumpPath = path.join(import.meta.dirname, 'fixtures', 'windows.dmp');
        minidump.moduleList(dumpPath, (err, modules) => {
          if (err) return done(err);
          assert.notEqual(modules.length, 0);
          assert(modules.some((m) => m.name.endsWith('\\electron.exe')));
          done();
        });
      });
    });

    describe('on a macOS dump', () => {
      it('calls back with a module list', function (done) {
        const dumpPath = path.join(import.meta.dirname, 'fixtures', 'mac.dmp');
        minidump.moduleList(dumpPath, (err, modules) => {
          if (err) return done(err);
          assert.notEqual(modules.length, 0);
          assert(modules.some((m) => m.name.endsWith('/Electron Helper')));
          done();
        });
      });
    });

    describe('on a malformed dump', () => {
      function writeDump(buf) {
        const dumpPath = temp.path({ suffix: '.dmp' });
        fs.writeFileSync(dumpPath, buf);
        return dumpPath;
      }

      it('returns an error for a truncated header', function (done) {
        const dumpPath = writeDump(Buffer.alloc(16));
        minidump.moduleList(dumpPath, (err, modules) => {
          assert(err instanceof Error, 'expected an Error');
          assert.match(err.message, /too small/);
          assert.equal(modules, undefined);
          done();
        });
      });

      it('returns an error for an invalid magic signature', function (done) {
        const dumpPath = writeDump(Buffer.alloc(32));
        minidump.moduleList(dumpPath, (err, modules) => {
          assert(err instanceof Error, 'expected an Error');
          assert.equal(err.message, 'not a minidump file');
          assert.equal(modules, undefined);
          done();
        });
      });

      it('returns an error for an out-of-bounds stream_directory_rva', function (done) {
        const buf = Buffer.alloc(32);
        buf.writeUInt32LE(0x504d444d, 0); // 'MDMP'
        buf.writeUInt32LE(0xa793, 4); // version
        buf.writeUInt32LE(1, 8); // stream_count
        buf.writeUInt32LE(0x1000, 12); // stream_directory_rva — far past EOF
        const dumpPath = writeDump(buf);
        minidump.moduleList(dumpPath, (err, modules) => {
          assert(err instanceof Error, 'expected an Error');
          assert.match(err.message, /out of bounds/);
          assert.equal(modules, undefined);
          done();
        });
      });
    });
  });
});

function downloadElectron(callback) {
  download('27.1.2', {
    cacheRoot: path.resolve(import.meta.dirname, '.cache'),
    downloadOptions: {
      quiet: true,
    },
  })
    .then((zipPath) => {
      const electronPath = temp.mkdirSync('node-minidump-');
      extractZip(zipPath, { dir: electronPath }, function (error) {
        if (error) return callback(error);

        if (process.platform === 'darwin') {
          callback(null, path.join(electronPath, 'Electron.app', 'Contents', 'MacOS', 'Electron'));
        } else {
          callback(null, path.join(electronPath, 'electron'));
        }
      });
    })
    .catch((error) => {
      callback(error);
    });
}

function downloadElectronSymbols(platform, callback) {
  downloadArtifact({
    cacheRoot: path.resolve(import.meta.dirname, '.cache'),
    version: '1.4.3', // Dumps were generated with Electron 1.4.3 x64
    arch: 'x64',
    platform,
    artifactName: 'electron',
    artifactSuffix: 'symbols',
    downloadOptions: {
      quiet: true,
    },
  })
    .then((zipPath) => {
      const symbolsPath = temp.mkdirSync('node-minidump-');
      extractZip(zipPath, { dir: symbolsPath }, function (error) {
        if (error) return callback(error);
        callback(null, path.join(symbolsPath, 'electron.breakpad.syms'));
      });
    })
    .catch((error) => {
      callback(error);
    });
}
