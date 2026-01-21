import { Lock } from 'lock'

/**
 * Default implementation of locking
 */
export default class InMemoryLock {
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
      this.lock(key, async (release) => {
        resolve(await cb().catch(reject))
        release((err) => {
          /* istanbul ignore next: @TODO needs unit test */
          if (err) {
            console.error(`${key} unlocked with error:`, err)
            reject(err)
          }
        })()
      })
    })
  }
}
