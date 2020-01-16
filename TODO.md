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
- [x] recheck for any eslint disable
- [x] remove unused files
- [x] remove unused code
- [x] './utils/validators' => './utils'

- [ ] restore -> redux?, https://medium.com/@sderosiaux/cqrs-what-why-how-945543482313 (We often have a function to replay everything at once, sometimes called a calculator, reducer, replayer:)
- [ ] rename some methods to align with semantics cqrs.nu
- [ ] recheck TODOs
- [ ] recheck `/* istanbul ignore` and add appropiate unit/regeression tests
- [ ] refactor/review busses
- [ ] refactor/review EventStore (ie. publish() async/await sequence vs. parallel)

## next interation

- [ ] refactor/review di/Container
- [ ] clearly document in variants of declaring handles!
- [ ] make EventStream a real stream

## Epic: Saga

- [ ] maybe better rename saga.enqueue to somthing command related
- [ ] review & refactor Saga implementation
