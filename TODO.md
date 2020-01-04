# TODOs

- [x] check on all occurencies of `/* istanbul ignore ... */` for missing tests, or better syntax
- [x] Eventstore asserts refactored
- [x] messageBus instance is mandatory
- [x] factor out validators to own module
- [x] check to also emit state to views (is state current state?) => no should not be emited
- [x] are sagas sequenced? => Yes, with locks they are
- [x] shouldn't we keep multiple snapshot versions? => Yes, and we do :)
- [x] check for restore option/method
- [x] add a view event to listen for completion?
- [x] restore from snapshot
- [ ] maybe better rename saga.enqueue to somthing command related
- [ ] clearly document in variants of declaring handles!
- [ ] review & refactor Saga implementation
- [ ] make EventStream a real stream

- [ ] remove unused files
- [ ] remove unused code
- [ ] recheck `/* istanbul ignore` and add appropiate unit/regeression tests
