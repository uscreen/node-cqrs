'use strict'

/**
 * DI Container
 */
module.exports.Container = require('./CqrsDomainContainer')

/**
 * CQRS/ES: Commands & Events
 */
module.exports.CommandBus = require('./CommandBus')
module.exports.EventStore = require('./EventStore')
module.exports.EventStream = require('./EventStream')

/**
 * CQRS/ES: write
 */
module.exports.AbstractAggregate = require('./AbstractAggregate')
module.exports.AggregateCommandHandler = require('./AggregateCommandHandler')

/**
 * CQRS/ES: read
 */
module.exports.AbstractProjection = require('./AbstractProjection')

/**
 * Saga
 */
module.exports.AbstractSaga = require('./AbstractSaga')
module.exports.SagaEventHandler = require('./SagaEventHandler')

/**
 * Locks
 */
module.exports.InMemoryLock = require('./locks/InMemoryLock')
module.exports.RedisLock = require('./locks/RedisLock')

/**
 * Busses
 */
module.exports.InMemoryMessageBus = require('./buses/InMemoryMessageBus')
module.exports.NatsMessageBus = require('./buses/NatsMessageBus')

/**
 * Storages
 */
module.exports.MongoEventStorage = require('./stores/MongoEventStorage')
module.exports.MongoSnapshotStorage = require('./stores/MongoSnapshotStorage')
module.exports.MongoView = require('./stores/MongoView')
