{
  'targets': [
    {
      'target_name': 'minidump',
      'type': 'none',
      'dependencies': [
        'deps/breakpad/breakpad.gyp:minidump_stackwalk',
      ],
    }
  ]
}
