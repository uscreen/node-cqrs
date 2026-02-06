# Agent Guidelines for @uscreen.de/cqrs-kit

This document provides coding guidelines and standards for AI agents working on this CQRS/ES (Event Sourcing) library.

## Project Overview

This is a CQRS (Command Query Responsibility Segregation) and Event Sourcing starter kit for Node.js applications following Domain-Driven Design (DDD) principles. It provides building blocks for Aggregates, Projections, Sagas, and Event Stores.

**Technology Stack:**
- Language: JavaScript (ES6+), not TypeScript
- Runtime: Node.js >= 18.x
- Package Manager: pnpm 10.27.0
- Module System: ES Modules (type: "module")
- Testing: Node.js native test runner
- Coverage: c8
- Linting: ESLint with @uscreen.de/eslint-config-prettystandard-node

## Build/Lint/Test Commands

### Running Tests
```bash
# Run all tests
pnpm test
# or: node --test

# Run tests with coverage
pnpm run test:cov

# Run tests for CI (summary only)
pnpm run test:ci

# Run a single test file
node --test test/noop.test.js
node --test test/integration/crudStyle.test.js
```

### Linting
```bash
# Lint all JavaScript files and auto-fix issues
pnpm run lint
# or: eslint '**/*.js' --fix
```

### No Build Step
This project uses JavaScript with ES modules. There is no build/compile step - code runs directly.

## Code Style Guidelines

### General Formatting
- **Indentation:** 2 spaces (no tabs except in Makefiles)
- **Charset:** UTF-8
- **Line Endings:** LF (Unix-style)
- **Final Newline:** Always insert
- **Trailing Whitespace:** Always trim
- **Config:** See .editorconfig for editor settings

### Import Statements
- Use ES6 import/export syntax
- Always include `.js` extension in relative imports
- Group imports logically:
  1. External dependencies (npm packages)
  2. Internal modules (./utils, ./stores, etc.)
  3. Blank line between groups

```javascript
// Good
import assert from 'assert-plus'
import rfdc from 'rfdc'
import { v4 as uuidv4 } from 'uuid'

import { getHandler, getClassName } from './utils/index.js'
import EventStream from './EventStream.js'

// Bad - missing .js extension
import EventStream from './EventStream'
```

### Naming Conventions

#### Classes
- Use PascalCase for class names
- Prefix abstract base classes with `Abstract`: `AbstractAggregate`, `AbstractProjection`, `AbstractSaga`
- Suffix service classes descriptively: `CommandBus`, `EventStore`, `EventStream`

```javascript
class AbstractAggregate { }
class UserAggregate extends AbstractAggregate { }
class MongoEventStorage { }
```

#### Methods and Functions
- Use camelCase for method/function names
- Use descriptive verbs: `handle`, `emit`, `mutate`, `restore`, `subscribe`
- Private/internal methods can be prefixed with underscore: `_project`, `_restore`
- Handler methods match event/command types exactly: `EventCreated`, `createUser`

```javascript
class Aggregate {
  createEvent(payload) { }  // Command handler
  EventCreated({ payload }) { }  // Event handler (in State class)
}
```

#### Variables and Constants
- Use camelCase for variables and function parameters
- Use SCREAMING_SNAKE_CASE for true constants
- Use Symbol for private properties

```javascript
const SNAPSHOT_EVENT_TYPE = 'snapshot'
const _id = Symbol('id')
const _changes = Symbol('changes')

function getHandler(context, messageType) { }
```

### Type Validation and Assertions
- Use `assert-plus` library for runtime validation
- Validate all function parameters
- Validate object properties with specific types

```javascript
import assert from 'assert-plus'

constructor(options) {
  assert.object(options, 'options')
  assert.string(options.type, 'options.type')
  assert.optionalArray(options.events, 'options.events')
}
```

### Error Handling
- Use assertions for invariant violations
- Throw descriptive errors for invalid states
- Use async/await for asynchronous operations (no callbacks)
- Handle promise rejections appropriately in test cleanup

```javascript
// Good - clear assertion
assert.func(handler, `'${command.type}' handler`)

// Good - async/await pattern
async deleteEvent() {
  await wait(10)
  this.emit('EventDeleted')
}

// Test cleanup
t.after(async () => {
  await wait(500)
  await client.close()
  redis.quit()
})
```

### Class Structure and Patterns

#### Getters and Setters
- Use getters for computed/derived properties
- Use getters to expose private Symbol properties
- Keep getters lightweight

```javascript
class AbstractAggregate {
  get name() {
    return getClassName(this).toLowerCase()
  }

  get id() {
    return this[_id]
  }
}
```

#### Handler Registration
- Use static `handles` getter or instance property to declare handled message types
- Handler methods match event/command type names exactly
- Support underscore-prefixed handlers for private/internal handlers

```javascript
class UserAggregate extends AbstractAggregate {
  static get handles() {
    return ['createUser', 'updateUser']
  }

  createUser(payload) { }
  _updateUser(payload) { }  // Private handler, still works
}
```

### Message Structure
All commands and events follow this interface:

```javascript
{
  type: string,              // Required: message type
  aggregateId?: string,      // Optional: target aggregate
  aggregateVersion?: number, // Optional: version number
  sagaId?: string,          // Optional: saga identifier
  sagaVersion?: number,     // Optional: saga version
  payload?: any,            // Optional: message data
  context?: any             // Optional: contextual metadata
}
```

### Testing Conventions
- Use Node.js native test runner (node:test)
- Use node:assert for assertions
- Structure tests with descriptive names
- Use `t.test()` for nested test cases
- Clean up resources in `t.after()` hooks
- Use helper functions for common setup (e.g., `createDomain`)

```javascript
import { test } from 'node:test'
import assert from 'node:assert'

test('Use MongoEventStorage in a CRUD alike way', async (t) => {
  const { cqrs } = await createDomain(t)
  
  await t.test('write a command', async () => {
    await cqrs.commandBus.send('createEvent', null, { payload })
    // assertions
  })
  
  // cleanup handled by createDomain via t.after()
})
```

### Dependency Injection
- Use the Container class for DI
- Register classes and instances separately
- Services are injected via constructor parameters

```javascript
const cqrs = new Container()
cqrs.register(MongoEventStorage, 'storage')
cqrs.registerInstance(eventsCollection, 'EventsCollection')
cqrs.registerAggregate(UserAggregate)
cqrs.registerProjection(UsersProjection, 'users')
cqrs.createUnexposedInstances()
cqrs.createAllInstances()
```

## Architecture Patterns

### Event Sourcing
- Aggregates handle commands and emit events
- Events are immutable once emitted
- State is derived by replaying events
- Snapshots can be taken for performance

### CQRS Pattern
- Commands: Write operations handled by Aggregates
- Queries: Read from Projections/Views
- Events connect write and read models
- Clear separation between command and query sides

## Additional Notes

- No TypeScript - this is a pure JavaScript project
- Supports MongoDB, Redis, and NATS integrations
- Thread-safe with lock mechanisms (InMemoryLock, RedisLock)
- Progress bars shown during view restoration
- Symbol-based private properties for encapsulation
