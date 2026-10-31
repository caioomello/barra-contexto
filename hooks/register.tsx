import type { Register } from 'claude-code'

const CACHE_TTL_MS = 5 * 60 * 1000
const BAR_WIDTH = 10

const bar = (percent: number) => {
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round((percent / 100) * BAR_WIDTH)))
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled)
}

const color = (percent: number) => (percent >= 85 ? 'red' : percent >= 60 ? 'yellow' : 'green')

export const register: Register = on => {
  let lastResponseAt = 0
  let contextPercent: number | undefined
  let week: { percentUsed: number; resetsAt?: string } | undefined

  on('session.start', async ($, e, next) => {
    $.clock.every(15000, () => $.ui.invalidate('ui.render'))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    contextPercent = e.context.percent
    week = e.rateLimits.find(r => r.kind === 'seven_day')
    if (e.changed.includes('context')) {
      lastResponseAt = await $.clock.now()
    }
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || contextPercent === undefined) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const age = lastResponseAt ? (await $.clock.now()) - lastResponseAt : Infinity
    const isWarm = age < CACHE_TTL_MS
    const left = Math.max(0, Math.ceil((CACHE_TTL_MS - age) / 1000))
    const cache = isWarm
      ? `cache quente (${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')})`
      : 'cache frio'

    return (
      <Box>
        <Text dimColor>contexto </Text>
        <Text color={color(contextPercent)}>{bar(contextPercent)} {contextPercent}%</Text>
        <Text dimColor> │ </Text>
        <Text color={isWarm ? 'green' : 'cyan'}>{cache}</Text>
        {week ? <Text dimColor> │ semana {week.percentUsed}%</Text> : null}
      </Box>
    )
  })
}
