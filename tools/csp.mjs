import { createHash } from 'node:crypto'

export function staticHeaders(template, documents) {
  const hashes = new Set()
  for (const html of documents) {
    for (const [, attributes, body] of html.matchAll(
      /<script\b([^>]*)>([\s\S]*?)<\/script>/g
    )) {
      if (!/\bsrc\s*=/.test(attributes) && body)
        hashes.add(
          `'sha256-${createHash('sha256').update(body).digest('base64')}'`
        )
    }
  }
  if (!template.includes('__NEXT_SCRIPT_HASHES__'))
    throw new Error('Missing static CSP hash marker')
  return template.replace(
    '__NEXT_SCRIPT_HASHES__',
    [...hashes].sort().join(' ')
  )
}
