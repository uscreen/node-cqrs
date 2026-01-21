import assert from 'assert-plus'

/**
 * Validate event structure
 */
export default (event) => {
  assert.object(event, 'event')
  assert.string(event.type, 'event.type')

  assert.ok(
    event.aggregateId ||
      /* istanbul ignore next: @todo: write some unit test */ event.sagaId,
    'either event.aggregateId or event.sagaId is required'
  )

  assert.ok(
    !(event.sagaId && typeof event.sagaVersion === 'undefined'),
    'event.sagaVersion is required, when event.sagaId is defined'
  )
}
