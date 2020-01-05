'use strict'

/**
 * DI Container
 */
exports.Container = require('./CqrsDomainContainer')

/**
 * CQRS/ES: Commands & Events
 */
exports.CommandBus = require('./CommandBus')
exports.EventStore = require('./EventStore')
exports.EventStream = require('./EventStream')

/**
 * CQRS/ES: write
 */
exports.AbstractAggregate = require('./AbstractAggregate')
exports.AggregateCommandHandler = require('./AggregateCommandHandler')

/**
 * CQRS/ES: read
 */
exports.AbstractProjection = require('./AbstractProjection')

/**
 * Saga
 */
exports.AbstractSaga = require('./AbstractSaga')
exports.SagaEventHandler = require('./SagaEventHandler')

/**
 * Locks
 */
exports.InMemoryLock = require('./locks/InMemoryLock')
exports.RedisLock = require('./locks/RedisLock')

/**
 * Busses
 */
exports.InMemoryMessageBus = require('./buses/InMemoryMessageBus')
exports.NatsMessageBus = require('./buses/NatsMessageBus')

/**
 * Storages
 */
exports.MongoEventStorage = require('./stores/MongoEventStorage')
exports.MongoSnapshotStorage = require('./stores/MongoSnapshotStorage')
exports.MongoView = require('./stores/MongoView')
