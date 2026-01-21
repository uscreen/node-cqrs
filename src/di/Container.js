import assert from 'assert-plus'

import getClassDependencyNames from './getClassDependencyNames.js'
import { isClass } from '../utils/index.js'
const _factories = Symbol('factories')
const _instances = Symbol('instances')

function createInstance(typeOrFactory, container, additionalOptions) {
  assert.func(typeOrFactory, 'typeOrFactory argument must be a Function')
  assert.ok(container, 'container argument required')
  assert.optionalObject(
    additionalOptions,
    'additionalOptions argument, when specified, must be an Object'
  )

  if (isClass(typeOrFactory)) {
    const Type = typeOrFactory

    const dependencies = getClassDependencyNames(Type)

    const parameters = dependencies
      ? dependencies.map((dependency) => {
          /* istanbul ignore if: needs test */
          if (typeof dependency === 'string') {
            return container[dependency]
          }

          /* istanbul ignore else: needs test */
          if (Array.isArray(dependency)) {
            const options = Object.assign({}, additionalOptions)
            dependency.forEach(
              (key) => options[key] || (options[key] = container[key])
            )
            return options
          }

          /* istanbul ignore next: needs test */
          return undefined
        })
      : []

    return new Type(...parameters)
  }

  return typeOrFactory(container)
}

/**
 *
 */
class Container {
  /**
   * Registered component factories
   */
  get factories() {
    return this[_factories] || (this[_factories] = new Set())
  }

  /**
   * Component instances
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
   */
  register(typeOrFactory, exposeAs, exposeMap) {
    assert.func(typeOrFactory, 'typeOrFactory argument must be a Function')
    assert.optionalString(
      exposeAs,
      'exposeAs argument, when provided, must be a non-empty string'
    )
    assert.optionalFunc(
      exposeMap,
      'exposeMap argument, when provided, must be a function'
    )

    const factory = (container) => container.createInstance(typeOrFactory)

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
      factory.unexposed = true
      this.factories.add(factory)
    }
  }

  /**
   * Registers an object instance in the container
   */
  registerInstance(instance, exposeAs) {
    assert.string(exposeAs, 'exposeAs argument must be a non-empty String')
    this.instances.set(exposeAs, instance)
    const get = () => this.instances.get(exposeAs)
    Object.defineProperty(this, exposeAs, { get })
  }

  /**
   * Create instances for components that do not have lazy getters defined on the Container.
   * For example, event or command handlers, that are not referenced from external components.
   */
  createUnexposedInstances() {
    for (const factory of this.factories.values()) {
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
    for (const factory of this.factories.values()) {
      factory(this)
      this.factories.delete(factory)
    }
  }

  /**
   * Creates an instance from the given type or factory using dependency injection
   */
  createInstance(typeOrFactory, additionalOptions) {
    return createInstance(typeOrFactory, this, additionalOptions)
  }
}

export default Container
