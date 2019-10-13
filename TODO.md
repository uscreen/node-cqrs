# TODOs

- [x] check on all occurencies of `/* istanbul ignore ... */` for missing tests, or better syntax
- [x] Eventstore asserts refactored
- [x] const internalMessageBus = new InMemoryBus() // @todo: better always require as options?
- [x] factor out validators to own module
- [ ] check for restore option/method
- [ ] check to also emit state to views (is state current state?)
- [ ] maybe better rename saga.enqueue to somthing command related
- [ ] clearly document in variants of declaring handles!
- [ ] shouldn't we keep multiple snapshot versions?
- [ ] make EventStream a real stream
- [ ] are sagas sequenced?
- [ ] remove unused files
- [ ] remove unused code

- [ ] recheck `/* istanbul ignore` and add appropiate unit/regeression tests
