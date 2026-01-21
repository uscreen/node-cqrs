import Lock from 'redis-lock'

/**
 * Redis based implementation of locking
 */
export default class RedisLock {
  /**
   * Creates an instance of RedisLock
   */
  constructor({ Redis }) {
    this.lock = Lock(Redis)
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
        release()
      })
    })
  }
}
