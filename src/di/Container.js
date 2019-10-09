'use strict'

const trace = require('debug')('cqrs:trace:Container')
const getClassDependencyNames = require('./getClassDependencyNames')
const _factories = Symbol('factories')
const _instances = Symbol('instances')

function isClass(func) {
  return (
    typeof func === 'function' &&
    Function.prototype.toString.call(func).startsWith('class')
  )
}

function isObject(instance) {
  return (
    typeof instance === 'object' &&
    instance != null &&
    !Array.isArray(instance) &&
    !(instance instanceof Date)
  )
}

function createInstance(typeOrFactory, container, additionalOptions) {
  /* istanbul ignore next */
  if (typeof typeOrFactory !== 'function')
    throw new TypeError('typeOrFactory argument must be a Function')
  /* istanbul ignore next */
  if (!container) throw new TypeError('container argument required')
  /* istanbul ignore next */
  if (additionalOptions && !isObject(additionalOptions))
    throw new TypeError(
      'additionalOptions argument, when specified, must be an Object'
    )

  if (isClass(typeOrFactory)) {
    const Type = typeOrFactory

    const dependencies = getClassDependencyNames(Type)

    /* istanbul ignore next */
    if (!dependencies) trace(`${Type.name || 'class'} has no constructor`)
    /* istanbul ignore next */ else if (!dependencies.length)
      trace(`${Type.name || 'class'} has no dependencies`)
    /* istanbul ignore next */ else
      trace(`${Type.name || 'class'} dependencies: ${dependencies}`)

    /* istanbul ignore next */
    const parameters = dependencies
      ? dependencies.map(dependency => {
          if (typeof dependency === 'string') {
            return container[dependency]
          } else if (Array.isArray(dependency)) {
            const options = Object.assign({}, additionalOptions)
            dependency.forEach(
              key => options[key] || (options[key] = container[key])
            )
            return options
          }
          return undefined
        })
      : []

    return new Type(...parameters)
  }

  return typeOrFactory(container)
}

/**
 * @implements {IContainerBuilder & IContainer}
 */
class Container {
  /**
   * Registered component factories
   *
   * @type {Set<(container: object) => object>}
   * @readonly
   */
  get factories() {
    return this[_factories] || (this[_factories] = new Set())
  }

  /**
   * Component instances
   *
   * @type {Map<string,object>}
   * @readonly
   */
  get instances() {
    return this[_instances] || (this[_instances] = new Map())
  }

  /**
   * Creates an instance of Container
   */
  constructor() {
    this.registerInstance(this, 'container')
  }

  /**
   * Registers a type or factory in the container
   * @param {ITypeOrFactory<object>} typeOrFactory Either a constructor function or a component factory
   * @param {string} [exposeAs] Component name to use for instance exposing on the container
   * @param {(instance: object) => object} [exposeMap] Instance -> Object-to-Expose mapping
   */
  register(typeOrFactory, exposeAs, exposeMap) {
    /* istanbul ignore next */
    if (typeof typeOrFactory !== 'function')
      throw new TypeError('typeOrFactory argument must be a Function')

    /* istanbul ignore next */
    if (exposeAs && typeof exposeAs !== 'string')
      throw new TypeError(
        'exposeAs argument, when provided, must be a non-empty string'
      )

    /* istanbul ignore next */
    if (exposeMap && typeof exposeMap !== 'function')
      throw new TypeError(
        'exposeMap argument, when provided, must be a function'
      )

    const factory = container => container.createInstance(typeOrFactory)

    if (exposeAs) {
      const getOrCreate = () => {
        if (!this.instances.has(exposeAs))
          this.instances.set(
            exposeAs,
            exposeMap ? exposeMap(factory(this)) : factory(this)
          )

        return this.instances.get(exposeAs)
      }

      Object.defineProperty(this, exposeAs, {
        get: getOrCreate,
        configurable: true,
        enumerable: true
      })

      this.factories.add(getOrCreate)
    } else {
      // @ts-ignore
      factory.unexposed = true
      this.factories.add(factory)
    }
  }

  /**
   * Registers an object instance in the container
   * @param  {any} instance Instance to register
   * @param  {String} exposeAs Object name to use for instance exposing on the container
   */
  registerInstance(instance, exposeAs) {
    /* istanbul ignore next */
    if (typeof exposeAs !== 'string' || !exposeAs.length)
      throw new TypeError('exposeAs argument must be a non-empty String')

    this.instances.set(exposeAs, instance)

    const get = () => this.instances.get(exposeAs)

    Object.defineProperty(this, exposeAs, { get })
  }

  /**
   * Create instances for components that do not have lazy getters defined on the Container.
   * For example, event or command handlers, that are not referenced from external components.
   */
  createUnexposedInstances() {
    trace('creating unexposed instances...')
    for (const factory of this.factories.values()) {
      // @ts-ignore
      if (factory.unexposed) {
        factory(this)
        this.factories.delete(factory)
      }
    }
  }

  /**
   * Creates instances for all types or factories registered in the Container
   */
  createAllInstances() {
    trace('creating all instances...')
    for (const factory of this.factories.values()) {
      factory(this)
      this.factories.delete(factory)
    }
  }

  /**
   * Creates an instance from the given type or factory using dependency injection
   * @param  {Function} typeOrFactory   Type or factory used to create an instance
   * @param  {Object} additionalOptions Additional options to append to the parameter object of the type constructor
   * @return {Object}                   Newly created instance
   */
  createInstance(typeOrFactory, additionalOptions) {
    trace(`creating ${typeOrFactory.name || 'unnamed'} instance...`)

    return createInstance(typeOrFactory, this, additionalOptions)
  }
}

module.exports = Container
