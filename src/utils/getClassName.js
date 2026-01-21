/**
 * Get instance class name
 */
export default (instance) => Object.getPrototypeOf(instance).constructor.name
