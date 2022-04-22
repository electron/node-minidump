module.exports = {
  getEffectiveArch: () => {
    return process.env.MINIDUMP_BUILD_ARCH || process.arch
  }
}
