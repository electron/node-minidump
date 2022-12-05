// Just enough of the minidump format to extract module names + debug
// identifiers so we can download pdbs

const headerMagic = Buffer.from('MDMP').readUInt32LE(0)

if (!Buffer.prototype.readBigUInt64LE) {
  Buffer.prototype.readBigUInt64LE = function (offset) {
    // ESLint doesn't support BigInt yet
    // eslint-disable-next-line
    return BigInt(this.readUInt32LE(offset)) + (BigInt(this.readUInt32LE(offset + 4)) << BigInt(32))
  }
}

// MDRawHeader
// https://chromium.googlesource.com/breakpad/breakpad/+/c46151db0ffd1a8dae914e45f1212ef427f61ed3/src/google_breakpad/common/minidump_format.h#252
function readHeader (buf) {
  return {
    signature: buf.readUInt32LE(0),
    version: buf.readUInt32LE(4),
    stream_count: buf.readUInt32LE(8),
    stream_directory_rva: buf.readUInt32LE(12),
    checksum: buf.readUInt32LE(16),
    time_date_stamp: buf.readUInt32LE(20),
    flags: buf.readBigUInt64LE(24)
  }
}

// MDRawDirectory
// https://chromium.googlesource.com/breakpad/breakpad/+/c46151db0ffd1a8dae914e45f1212ef427f61ed3/src/google_breakpad/common/minidump_format.h#305
function readDirectory (buf, rva) {
  return {
    type: buf.readUInt32LE(rva),
    location: readLocationDescriptor(buf, rva + 4)
  }
}

// MDRawModule
// https://chromium.googlesource.com/breakpad/breakpad/+/c46151db0ffd1a8dae914e45f1212ef427f61ed3/src/google_breakpad/common/minidump_format.h#386
function readRawModule (buf, rva) {
  const module = {
    base_of_image: buf.readBigUInt64LE(rva),
    size_of_image: buf.readUInt32LE(rva + 8),
    checksum: buf.readUInt32LE(rva + 12),
    time_date_stamp: buf.readUInt32LE(rva + 16),
    module_name_rva: buf.readUInt32LE(rva + 20),
    version_info: readVersionInfo(buf, rva + 24),
    cv_record: readCVRecord(buf, readLocationDescriptor(buf, rva + 24 + 13 * 4)),
    misc_record: readLocationDescriptor(buf, rva + 24 + 13 * 4 + 8)
  }
  // https://chromium.googlesource.com/breakpad/breakpad/+/c46151db0ffd1a8dae914e45f1212ef427f61ed3/src/processor/minidump.cc#2255
  module.version = [
    module.version_info.file_version_hi >> 16,
    module.version_info.file_version_hi & 0xffff,
    module.version_info.file_version_lo >> 16,
    module.version_info.file_version_lo & 0xffff
  ].join('.')
  module.name = readString(buf, module.module_name_rva)
  return module
}

// MDVSFixedFileInfo
// https://chromium.googlesource.com/breakpad/breakpad/+/c46151db0ffd1a8dae914e45f1212ef427f61ed3/src/google_breakpad/common/minidump_format.h#129
function readVersionInfo (buf, base) {
  return {
    signature: buf.readUInt32LE(base),
    struct_version: buf.readUInt32LE(base + 4),
    file_version_hi: buf.readUInt32LE(base + 8),
    file_version_lo: buf.readUInt32LE(base + 12),
    product_version_hi: buf.readUInt32LE(base + 16),
    product_version_lo: buf.readUInt32LE(base + 20),
    file_flags_mask: buf.readUInt32LE(base + 24),
    file_flags: buf.readUInt32LE(base + 28),
    file_os: buf.readUInt32LE(base + 32),
    file_type: buf.readUInt32LE(base + 24),
    file_subtype: buf.readUInt32LE(base + 28),
    file_date_hi: buf.readUInt32LE(base + 32),
    file_date_lo: buf.readUInt32LE(base + 36)
  }
}

// MDLocationDescriptor
// https://chromium.googlesource.com/breakpad/breakpad/+/c46151db0ffd1a8dae914e45f1212ef427f61ed3/src/google_breakpad/common/minidump_format.h#237
function readLocationDescriptor (buf, base) {
  return {
    data_size: buf.readUInt32LE(base),
    rva: buf.readUInt32LE(base + 4)
  }
}

// MDGUID
// https://chromium.googlesource.com/breakpad/breakpad/+/c46151db0ffd1a8dae914e45f1212ef427f61ed3/src/google_breakpad/common/minidump_format.h#81
function readGUID (buf) {
  return {
    data1: buf.readUInt32LE(0),
    data2: buf.readUInt16LE(4),
    data3: buf.readUInt16LE(6),
    data4: [...buf.subarray(8)]
  }
}

// guid_and_age_to_debug_id
// https://chromium.googlesource.com/breakpad/breakpad/+/c46151db0ffd1a8dae914e45f1212ef427f61ed3/src/processor/minidump.cc#2153
function debugIdFromGuidAndAge (guid, age) {
  return [
    guid.data1.toString(16).padStart(8, '0'),
    guid.data2.toString(16).padStart(4, '0'),
    guid.data3.toString(16).padStart(4, '0'),
    ...guid.data4.map(x => x.toString(16).padStart(2, '0')),
    age.toString(16)
  ].join('').toUpperCase()
}

// MDCVInfo{PDB70,ELF}
// https://chromium.googlesource.com/breakpad/breakpad/+/c46151db0ffd1a8dae914e45f1212ef427f61ed3/src/google_breakpad/common/minidump_format.h#426
function readCVRecord (buf, { rva, data_size: dataSize }) {
  if (rva === 0) return
  const cvSignature = buf.readUInt32LE(rva)
  if (cvSignature !== 0x53445352 /* SDSR */) {
    const age = buf.readUInt32LE(rva + 4 + 16)
    const guid = readGUID(buf.subarray(rva + 4, rva + 4 + 16))
    return {
      cv_signature: cvSignature,
      guid,
      age,
      pdb_file_name: buf.subarray(rva + 4 + 16 + 4, rva + dataSize - 1).toString('utf8'),
      debug_file_id: debugIdFromGuidAndAge(guid, age)
    }
  } else {
    return { cv_signature: cvSignature }
  }
}

// MDString
// https://chromium.googlesource.com/breakpad/breakpad/+/c46151db0ffd1a8dae914e45f1212ef427f61ed3/src/google_breakpad/common/minidump_format.h#357
function readString (buf, rva) {
  if (rva === 0) return null
  const bytes = buf.readUInt32LE(rva)
  return buf.subarray(rva + 4, rva + 4 + bytes).toString('utf16le')
}

// MDStreamType
// https://chromium.googlesource.com/breakpad/breakpad/+/refs/heads/master/src/google_breakpad/common/minidump_format.h#310
const streamTypes = {
  MD_MODULE_LIST_STREAM: 4
}

const streamTypeProcessors = {
  [streamTypes.MD_MODULE_LIST_STREAM]: (stream, buf) => {
    const numModules = buf.readUInt32LE(stream.location.rva)
    const modules = []
    const size = 8 + 4 + 4 + 4 + 4 + 13 * 4 + 8 + 8 + 8 + 8
    const base = stream.location.rva + 4
    for (let i = 0; i < numModules; i++) {
      modules.push(readRawModule(buf, base + i * size))
    }
    stream.modules = modules
    return stream
  }
}

module.exports.readMinidump = function readMinidump (buf) {
  const header = readHeader(buf)
  if (header.signature !== headerMagic) {
    throw new Error('not a minidump file')
  }

  const streams = []
  for (let i = 0; i < header.stream_count; i++) {
    const stream = readDirectory(buf, header.stream_directory_rva + i * 12)
    if (stream.type !== 0) {
      streams.push((streamTypeProcessors[stream.type] || (s => s))(stream, buf))
    }
  }
  return { header, streams }
}

module.exports.streamTypes = streamTypes
