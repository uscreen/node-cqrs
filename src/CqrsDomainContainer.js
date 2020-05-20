'use strict'

const assert = require('assert-plus')

const { isClass, getHandledMessageTypes } = require('./utils')
const Container = require('./di/Container')
const CommandBus = require('./CommandBus')
const EventStore = require('./EventStore')
const AggregateCommandHandler = require('./AggregateCommandHandler')
const SagaEventHandler = require('./SagaEventHandler')

/**
 * Dependency injection container with CQRS-specific methods
 */
class CqrsDomainContainer extends Container {
  /**
   * Creates an instance of CqrsDomainContainer
   */
  constructor() {
    super()
    this.register(CommandBus, 'commandBus')
    this.register(EventStore, 'eventStore')
  }

  /**
   * Register command handler, which will be subscribed
   * to commandBus upon instance creation
   */
  registerCommandHandler(typeOrFactory) {
    super.register((container) => {
      const handler = container.createInstance(typeOrFactory)
      handler.subscribe(container.commandBus)
      return handler
    })
  }

  /**
   * Register event receptor, which will be subscribed
   * to eventStore upon instance creation
   */
  registerEventReceptor(typeOrFactory) {
    super.register((container) => {
      const receptor = container.createInstance(typeOrFactory)
      receptor.subscribe(container.eventStore)
      return receptor
    })
  }

  /**
   * Register projection, which will expose view and will be subscribed
   * to eventStore and will restore its state upon instance creation
   */
  registerProjection(ProjectionType, exposedViewName) {
    assert.ok(
      isClass(ProjectionType),
      'ProjectionType argument must be a constructor function'
    )
    super.register(
      (container) => {
        const projection = container.createInstance(ProjectionType)
        projection.subscribe(container.eventStore)
        return projection
      },
      exposedViewName,
      (p) => p.view
    )
  }

  /**
   * Register aggregate type in the container
   */
  registerAggregate(AggregateType) {
    assert.ok(
      isClass(AggregateType),
      'AggregateType argument must be a constructor function'
    )
    this.registerCommandHandler(
      (container) =>
        new AggregateCommandHandler({
          eventStore: container.eventStore,
          aggregateType: (options) =>
            container.createInstance(AggregateType, options),
          handles: getHandledMessageTypes(AggregateType)
        })
    )
  }

  /**
   * Register saga type in the container
   */
  registerSaga(SagaType) {
    assert.ok(
      isClass(SagaType),
      'SagaType argument must be a constructor function'
    )
    this.registerEventReceptor(
      (container) =>
        new SagaEventHandler({
          eventStore: container.eventStore,
          commandBus: container.commandBus,
          sagaType: (options) => container.createInstance(SagaType, options),
          handles: SagaType.handles,
          startsWith: SagaType.startsWith,
          queueName: SagaType.name
        })
    )
  }
}

module.exports = CqrsDomainContainer
