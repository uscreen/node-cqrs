'use strict'

// require('debug').enable('cqrs:*');

require('./utilsTests')

require('./InMemoryMessageBusTests')
require('./InMemoryViewTests')

require('./EventStream')
require('./EventStoreTests')
require('./CommandBusTests')
require('./ContainerTests')

require('./AbstractAggregate')
require('./AggregateCommandHandlerTests')

require('./AbstractSagaTests')
require('./SagaEventHandlerTests')

require('./AbstractProjectionTests')

require('../examples/user-domain-tests')
