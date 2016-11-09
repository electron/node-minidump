{
  'variables': {
    'chromeos%': 0,
    'os_bsd%': 0,
    'mac_deployment_target%': '10.9',
  },
  'target_defaults': {
    'conditions': [
      ['OS=="linux"', {
        'cflags': ['-w', '-std=c++0x'],
      }],
      ['OS=="mac"', {
        'xcode_settings': {
          'OTHER_CFLAGS': ['-w'],
          'CLANG_CXX_LANGUAGE_STANDARD': 'c++11',
          'CLANG_CXX_LIBRARY': 'libc++',
        }
      }]
    ]
  }
}
