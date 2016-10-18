{
  'targets': [
    {
      'target_name': 'minidump',
      'type': 'none',
      'conditions': [
        ['OS=="win"', {
        }, {
          'dependencies': [
            'deps/breakpad/breakpad.gyp:minidump_stackwalk',
            'deps/breakpad/breakpad.gyp:dump_syms#host',
          ],
        }],
      ],
    }
  ]
}
