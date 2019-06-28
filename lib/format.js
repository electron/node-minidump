// Just enough of the minidump format to extract module names + debug
// identifiers so we can download pdbs

const headerMagic = Buffer.from('MDMP').readUInt32LE(0)

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

function readLocationDescriptor (buf, base) {
  return {
    data_size: buf.readUInt32LE(base),
    rva: buf.readUInt32LE(base + 4)
  }
}

function readGUID (buf) {
  return {
    data1: buf.readUInt32LE(0),
    data2: buf.readUInt16LE(4),
    data3: buf.readUInt16LE(6),
    data4: [...buf.subarray(8)]
  }
}

function debugIdFromGuidAndAge (guid, age) {
  return [
    guid.data1.toString(16).padStart(8, '0'),
    guid.data2.toString(16).padStart(4, '0'),
    guid.data3.toString(16).padStart(4, '0'),
    ...guid.data4.map(x => x.toString(16).padStart(2, '0')),
    age.toString(16)
  ].join('').toUpperCase()
}

function readCVRecord (buf, { rva, data_size: dataSize }) {
  if (rva === 0) return
  const age = buf.readUInt32LE(rva + 4 + 16)
  const guid = readGUID(buf.subarray(rva + 4, rva + 4 + 16))
  return {
    signature: buf.readUInt32LE(rva),
    guid,
    age,
    pdb_file_name: buf.subarray(rva + 4 + 16 + 4, rva + dataSize - 1).toString('utf8'),
    debug_file_id: debugIdFromGuidAndAge(guid, age)
  }
}

function readString (buf, rva) {
  if (rva === 0) return null
  const bytes = buf.readUInt32LE(rva)
  return buf.subarray(rva + 4, rva + 4 + bytes).toString('utf16le')
}

const streamTypes = {
  4 /* MD_MODULE_LIST_STREAM */: (stream, buf) => {
    const numModules = buf.readUInt32LE(stream.rva)
    const modules = []
    const size = 8 + 4 + 4 + 4 + 4 + 13 * 4 + 8 + 8 + 8 + 8
    for (let i = 0; i < numModules; i++) {
      const base = stream.rva + 4 + i * size
      const module = {
        // eslint-disable-next-line
        base_of_image: BigInt(buf.readUInt32LE(base)) + (BigInt(buf.readUInt32LE(base + 4)) << BigInt(32)),
        size_of_image: buf.readUInt32LE(base + 8),
        checksum: buf.readUInt32LE(base + 12),
        time_date_stamp: buf.readUInt32LE(base + 16),
        module_name_rva: buf.readUInt32LE(base + 20),
        version_info: readVersionInfo(buf, base + 24),
        cv_record: readCVRecord(buf, readLocationDescriptor(buf, base + 24 + 13 * 4)),
        misc_record: readLocationDescriptor(buf, base + 24 + 13 * 4 + 8)
      }
      module.version = [
        module.version_info.file_version_hi >> 16,
        module.version_info.file_version_hi & 0xffff,
        module.version_info.file_version_lo >> 16,
        module.version_info.file_version_lo & 0xffff
      ].join('.')
      module.name = readString(buf, module.module_name_rva)
      modules.push(module)
    }
    stream.modules = modules
    return stream
  }
}

module.exports.readMinidump = function readMinidump (buf) {
  const header = {
    signature: buf.readUInt32LE(0),
    version: buf.readUInt32LE(4),
    stream_count: buf.readUInt32LE(8),
    stream_directory_rva: buf.readUInt32LE(12),
    checksum: buf.readUInt32LE(16),
    time_date_stamp: buf.readUInt32LE(20),
    flags: 0 // TODO uint64
  }
  if (header.signature !== headerMagic) {
    throw new Error('not a minidump file')
  }

  const streams = []
  for (let i = 0; i < header.stream_count; i++) {
    const stream = {
      type: buf.readUInt32LE(header.stream_directory_rva + i * 12),
      size: buf.readUInt32LE(header.stream_directory_rva + i * 12 + 4),
      rva: buf.readUInt32LE(header.stream_directory_rva + i * 12 + 8)
    }
    if (stream.type !== 0) {
      streams.push((streamTypes[stream.type] || (s => s))(stream, buf))
    }
  }
  return { header, streams }
}
