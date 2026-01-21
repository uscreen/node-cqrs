/**
 * A collection of events
 */
class EventStream extends Array {
  /**
   * Creates an instance of EventStream
   */
  constructor(...args) {
    super()
    const events = [].concat(...args)
    for (const e of events) super.push(e)
  }

  /**
   * Create new EventStream with events that match certain condition
   */
  filter(condition) {
    return new EventStream([...this].filter(condition))
  }

  /**
   * Map stream events to another collection
   */
  map(mapFn) {
    return [...this].map(mapFn)
  }
}

export default EventStream
