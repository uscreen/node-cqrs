const tap = require('tap')
const { config } = require('./helper')

tap.test('Test Setup', t => {
  console.log(config)
  t.strictEqual(true, true, 'Tests and assertions should work')
  t.end()
})
