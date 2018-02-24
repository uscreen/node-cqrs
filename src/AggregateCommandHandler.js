'use strict';

const Observer = require('./Observer');
const { isClass } = require('./utils');
const info = require('debug')('cqrs:info');

/**
 * Copy context fields from source command to event
 *
 * @param {ICommand} command
 * @returns {(event: IEvent) => Readonly<IEvent>}
 */
function augmentEventFromCommand(command) {
	return event => {
		if (event.context === undefined && command.context !== undefined)
			event.context = command.context;
		if (event.sagaId === undefined && command.sagaId !== undefined)
			event.sagaId = command.sagaId;
		if (event.sagaVersion === undefined && command.sagaVersion !== undefined)
			event.sagaVersion = command.sagaVersion;

		return Object.freeze(event);
	};
}

/**
 * Aggregate command handler.
 *
 * Subscribes to event store and awaits aggregate commands.
 * Upon command receiving creates an instance of aggregate,
 * restores its state, passes command and commits emitted events to event store.
 *
 * @class AggregateCommandHandler
 * @extends {Observer}
 * @implements {ICommandHandler}
 */
class AggregateCommandHandler extends Observer {

	/**
	 * Creates an instance of AggregateCommandHandler.
	 *
	 * @param {object} options
	 * @param {IEventStore} options.eventStore
	 * @param {IAggregateConstructor | IAggregateFactory} options.aggregateType
	 * @param {string[]} [options.handles]
	 */
	constructor(options) {
		if (!options.eventStore) throw new TypeError('eventStore argument required');
		if (!options.aggregateType) throw new TypeError('aggregateType argument required');
		super();

		this._eventStore = options.eventStore;
		if (isClass(options.aggregateType)) {
			/** @type {IAggregateConstructor} */
			// @ts-ignore
			const AggregateType = options.aggregateType;

			this._aggregateFactory = params => new AggregateType(params);
			this._handles = AggregateType.handles;
		}
		else {
			this._aggregateFactory = options.aggregateType;
			this._handles = options.handles;
		}
	}

	/**
	 * Subscribe to all command types handled by aggregateType
	 *
	 * @param {ICommandBus} commandBus
	 * @returns {any} - whatever EventEmitter.on returns for each messageType
	 */
	subscribe(commandBus) {
		return super.subscribe(commandBus, this._handles, this.execute);
	}

	/**
	 * Restore aggregate from event store events
	 *
	 * @param {Identifier} id
	 * @returns {Promise<IAggregate>}
	 */
	async _restoreAggregate(id) {
		if (!id) throw new TypeError('id argument required');

		const events = await this._eventStore.getAggregateEvents(id);
		const aggregate = this._aggregateFactory.call(null, { id, events });
		info('%s state restored from %s', aggregate, events);

		return aggregate;
	}

	/**
	 * Create new aggregate with new Id generated by event store
	 *
	 * @returns {Promise<IAggregate>}
	 */
	async _createAggregate() {
		const id = await this._eventStore.getNewId();
		const aggregate = this._aggregateFactory.call(null, { id });
		info('%s created', aggregate);

		return aggregate;
	}

	/**
	 * Pass a command to corresponding aggregate
	 *
	 * @param {ICommand} cmd - command to execute
	 * @return {Promise<IEventStream>} events
	 */
	async execute(cmd) {
		if (!cmd) throw new TypeError('cmd argument required');
		if (!cmd.type) throw new TypeError('cmd.type argument required');

		const aggregate = cmd.aggregateId ?
			await this._restoreAggregate(cmd.aggregateId) :
			await this._createAggregate();

		const handlerResponse = aggregate.handle(cmd);
		if (handlerResponse instanceof Promise)
			await handlerResponse;

		let events = aggregate.changes;
		info('%s "%s" command processed, %s produced', aggregate, cmd.type, events);
		if (!events.length)
			return [];

		events.forEach(augmentEventFromCommand(cmd));

		if (aggregate.shouldTakeSnapshot && this._eventStore.snapshotsSupported) {
			aggregate.takeSnapshot();
			events = aggregate.changes;
		}

		// @ts-ignore
		await this._eventStore.commit(events);

		return events;
	}
}

module.exports = AggregateCommandHandler;
