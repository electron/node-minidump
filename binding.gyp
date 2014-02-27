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
          ],
        }],
      ],
    }
  ]
}
