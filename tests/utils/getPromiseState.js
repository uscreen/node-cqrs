'use strict'

module.exports = async function getPromiseState(promise) {
  // move actual 'race' to the end of the Promise exec queue
  await Promise.resolve()

  return Promise.race([promise, Promise.reject(new Error('timeout'))]).then(
    () => 'resolved',
    err => (err.message !== 'timeout' ? 'rejected' : 'pending')
  )
}
