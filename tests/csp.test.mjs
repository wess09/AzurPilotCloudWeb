import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { staticHeaders } from '../tools/csp.mjs'

test('export CSP hashes actual inline hydration scripts and permits neither arbitrary scripts nor eval', () => {
  const script = 'self.__next_f.push(["碧蓝航线"])'
  const result = staticHeaders("script-src 'self' __NEXT_SCRIPT_HASHES__; connect-src 'self';", [`<script>${script}</script><script src="/external.js"></script>`, `<script>${script}</script>`])
  const hash = createHash('sha256').update(script).digest('base64')
  assert.equal(result, `script-src 'self' 'sha256-${hash}'; connect-src 'self';`)
  assert.doesNotMatch(result, /unsafe-inline|unsafe-eval/)
})
