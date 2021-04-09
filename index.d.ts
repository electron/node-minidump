/**
 * Add search paths for looking up symbol files.
 */
export function addSymbolPath(...paths: string[]): void

/**
 * Get the stack trace from `minidumpFilePath`
 * The `callback` would be called with `callback(error, report)` upon completion.
 */
export function walkStack(
  minidump: string,
  callback: (err: Error, result: Buffer) => void,
  commandArgs?: string[]
): void
export function walkStack(
  minidump: string,
  symbolPaths: string[],
  callback: (err: Error, result: Buffer) => void,
  commandArgs?: string[]
): void

/**
 * Get the contents of the minidump file in somewhat readable text(not yet symbolicated).
 * The `callback` would be called with `callback(error, report)` upon completion.
 */
export function dump(
  minidump: string,
  callback: (err: Error, result: Buffer) => void,
  commandArgs?: string[],
): void

/**
 * Dump debug symbols in minidump format from `binaryPath`
 * The `callback` would be called with `callback(error, minidump)` upon completion.
 */
export function dumpSymbol(
  binaryPath: string,
  callback: (err: Error, result: string) => void
): void

type ModuleInfo = {
  version: string
  name: string
  pdb_file_name?: string
  debug_identifier?: string
}

export function moduleList(
  minidump: string,
  callback: (err: Error, result: ModuleInfo[]) => void
): void
