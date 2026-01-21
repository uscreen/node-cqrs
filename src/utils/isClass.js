/**
 * returns true on functions creating a class
 */
export default (func) => {
  return (
    typeof func === 'function' &&
    Function.prototype.toString.call(func).startsWith('class')
  )
}
