const tap = require('tap')
const { wait } = require('../helper')
const { InMemoryLock } = require('../../index')

tap.test('InMemoryLock', async t => {
  const locker = new InMemoryLock()

  await t.test(
    'should lock and execute in sequence when used on same keys',
    async t => {
      const order = []
      const results = await Promise.all([
        locker.locked('sameKey', async () => {
          await wait(10)
          order.push('ok1')
          return 'ok1'
        }),
        locker.locked('sameKey', async () => {
          await wait(5)
          order.push('ok2')
          return 'ok2'
        })
      ])

      try {
        await locker.locked('sameKey', async () => {
          order.push('error')
          throw new Error('error')
        })
      } catch (error) {
        results.push(error.message)
      }

      t.same(['ok1', 'ok2', 'error'], results)
      t.same(['ok1', 'ok2', 'error'], order)

      t.end()
    }
  )

  await t.test(
    'should lock and execute in parallel when used on different keys',
    async t => {
      const order = []
      const results = await Promise.all([
        locker.locked('myKey-1', async () => {
          await wait(10)
          order.push('ok1')
          return 'ok1'
        }),
        locker.locked('myKey-2', async () => {
          await wait(5)
          order.push('ok2')
          return 'ok2'
        })
      ])

      try {
        await locker.locked('myKey-3', async () => {
          order.push('error')
          throw new Error('error')
        })
      } catch (error) {
        results.push(error.message)
      }

      t.same(['ok1', 'ok2', 'error'], results)
      t.same(['ok2', 'ok1', 'error'], order)
      t.end()
    }
  )

  t.end()
})
