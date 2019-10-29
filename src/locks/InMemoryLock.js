'use strict'

const { Lock } = require('lock')

/**
 * Default implementation of locking
 */
module.exports = class InMemoryLock {
  /**
   * Creates an instance of InMemoryLock
   */
  constructor() {
    this.lock = Lock()
  }

  /**
   * Acquire lock on given key
   * execute given cb
   * resolve with it's result
   * release lock
   */
  locked(key, cb) {
    return new Promise((resolve, reject) => {
      this.lock(key, async release => {
        resolve(await cb().catch(reject))
        release(err => {
          /* istanbul ignore next */
          if (err) {
            console.error(`${key} unlocked with error:`, err)
            reject(err)
          }
        })()
      })
    })
  }
}
