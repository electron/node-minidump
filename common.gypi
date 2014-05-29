{
  'target_defaults': {
    'conditions': [
      ['OS=="linux"', {
        'cflags': ['-w'],
      }],
      ['OS=="mac"', {
        'xcode_settings': {
          'OTHER_CFLAGS': ['-w'],
        }
      }]
    ]
  }
}
