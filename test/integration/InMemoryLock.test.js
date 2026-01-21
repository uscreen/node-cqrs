const { test } = require('node:test')
const assert = require('node:assert')
const { wait } = require('../helper')
const { InMemoryLock } = require('../../index')

// passed

test('InMemoryLock', async (t) => {
  const locker = new InMemoryLock()

  await t.test(
    'should lock and execute in sequence when used on same keys',
    async () => {
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

      assert.deepStrictEqual(results, ['ok1', 'ok2', 'error'])
      assert.deepStrictEqual(order, ['ok1', 'ok2', 'error'])
    }
  )

  await t.test(
    'should lock and execute in parallel when used on different keys',
    async () => {
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

      assert.deepStrictEqual(results, ['ok1', 'ok2', 'error'])
      assert.deepStrictEqual(order, ['ok2', 'ok1', 'error'])
    }
  )
})
