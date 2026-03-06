# Agent Guidelines for @uscreen.de/cqrs-kit

CQRS/Event Sourcing starter kit for Node.js (DDD). Provides Aggregates, Projections, Sagas, and Event Stores.

**Stack:** JavaScript (ES6+, no TypeScript), Node.js >= 18, pnpm 10.27, ES Modules (`"type": "module"`).

## Build/Lint/Test Commands

No build step — JavaScript runs directly.

```bash
# Run all tests (with coverage via c8)
pnpm test

# Run a single test file
node --test test/noop.test.js
node --test test/integration/crudStyle.test.js

# Coverage report (HTML + text)
pnpm run test:cov

# Lint (uses ESLint 9 flat config with @antfu/eslint-config)
pnpm run lint        # check only
pnpm run lint:fix    # auto-fix

# Start/stop backing services (MongoDB, Redis, NATS via Docker)
make start
make stop
```

Integration tests require running services (`make start` first).

## Code Style Guidelines

### Formatting
- 2 spaces indentation (tabs only in Makefiles)
- UTF-8, LF line endings, trim trailing whitespace, final newline
- No trailing commas (`style/comma-dangle: ['error', 'never']`)
- Curly braces: `multi-line, consistent` — single-line `if` can omit braces, multi-line must have them
- Formatting enforced by `eslint-plugin-format` via `@antfu/eslint-config` (no Prettier)

### Imports
- ES6 `import`/`export` only — no CommonJS
- **Always include `.js` extension** in relative imports
- Group: external deps first, blank line, then internal modules

```javascript
import assert from 'assert-plus'
import { v4 as uuidv4 } from 'uuid'

import EventStream from './EventStream.js'
import { getHandler } from './utils/index.js'
```

### Naming Conventions
- **Classes:** PascalCase. Abstract bases prefixed `Abstract` (e.g. `AbstractAggregate`). One class per file, filename matches class name.
- **Methods/functions:** camelCase. Handler methods match event/command type names exactly (`createEvent`, `EventCreated`).
- **Private methods:** underscore prefix (`_project`, `_restore`).
- **Private properties:** Symbol-based (`const _id = Symbol('id')`; access via `this[_id]`).
- **Constants:** SCREAMING_SNAKE_CASE (`SNAPSHOT_EVENT_TYPE`).
- **Variables/params:** camelCase.

### Type Validation (Runtime)
Use `assert-plus` for all parameter validation — no TypeScript, no JSDoc types:

```javascript
import assert from 'assert-plus'

constructor(options) {
  assert.object(options, 'options')
  assert.string(options.type, 'options.type')
  assert.optionalArray(options.events, 'options.events')
}
```

Common assertions: `assert.object()`, `assert.string()`, `assert.func()`, `assert.array()`, `assert.number()`, `assert.ok()`, `assert.optionalFunc()`, `assert.optionalObject()`, `assert.optionalString()`, `assert.arrayOfString()`.

### Error Handling
- Assertions for invariant violations (fail-fast)
- `async`/`await` for all async operations — no callbacks
- Clean up resources in test `t.after()` hooks

### Class Patterns
- `export default` for classes
- Constructor takes an `options` object, validated with `assert-plus`
- Getters to expose Symbol-based private state and computed properties
- Static `handles` getter declares handled message types
- DI via `Container` — dependencies resolved by matching constructor parameter names

```javascript
class UserAggregate extends AbstractAggregate {
  static get handles() {
    return ['createUser', 'updateUser']
  }

  createUser(payload) {
    this.emit('EventCreated', payload)
  }
}
```

### Testing Conventions
- Node.js native test runner (`node:test`) with `node:assert`
- Nested tests via `t.test()` — always `await` nested tests
- `createDomain(t)` helper sets up full CQRS domain and handles cleanup
- `wait(ms)` helper in `test/helper.js` for timing-sensitive tests

```javascript
import assert from 'node:assert'
import { test } from 'node:test'
import { createDomain } from '../domain.js'

test('CRUD lifecycle', async (t) => {
  const { cqrs } = await createDomain(t)

  await t.test('sends a command', async () => {
    await cqrs.commandBus.send('createEvent', null, { payload })
    assert.strictEqual(result.length, 1)
  })
})
```

## Architecture

### Event Sourcing Flow
1. Commands sent via `CommandBus.send(type, aggregateId, { payload, context })`
2. `AggregateCommandHandler` restores aggregate from stored events
3. Aggregate command handler emits events via `this.emit(type, payload)`
4. `EventStore` persists events and publishes to message bus
5. `AbstractProjection` subscribes to events, updates views (with locking)
6. `SagaEventHandler` restores sagas, applies events, sends enqueued commands

### Message Structure
```javascript
{
  type: string,              // Required
  aggregateId?: string,
  aggregateVersion?: number,
  sagaId?: string,
  sagaVersion?: number,
  payload?: any,
  context?: any
}
```

### Dependency Injection
```javascript
const cqrs = new CqrsDomainContainer()
cqrs.register(MongoEventStorage, 'storage')
cqrs.registerInstance(eventsCollection, 'EventsCollection')
cqrs.registerAggregate(UserAggregate)
cqrs.registerProjection(UsersProjection, 'users')
cqrs.createUnexposedInstances()
cqrs.createAllInstances()
```

### Key Integrations
- **MongoDB:** Event storage, snapshot storage, views (`src/stores/`)
- **Redis:** Distributed locking (`src/locks/RedisLock.js`)
- **NATS:** Message bus for distributed events (`src/buses/NatsMessageBus.js`)
- **In-memory alternatives:** `InMemoryMessageBus`, `InMemoryLock` for testing
