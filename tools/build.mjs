import { spawnSync } from 'node:child_process'
import { cp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { staticHeaders } from './csp.mjs'
const target = process.argv[2]
if (!['stats', 'admin'].includes(target))
  throw new Error('Expected stats or admin')
const result = spawnSync(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'build', target],
  { stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } }
)
if (result.status !== 0) process.exit(result.status ?? 1)
const output = resolve('dist', target)
if (dirname(output) !== resolve('dist'))
  throw new Error('Invalid build destination')
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(resolve(target, 'out'), output, {
  recursive: true,
  force: true
})
const files = await readdir(output, { recursive: true })
const html = await Promise.all(
  files
    .filter((file) => file.endsWith('.html'))
    .map((file) => readFile(resolve(output, file), 'utf8'))
)
const headers = staticHeaders(
  await readFile(resolve(target, 'public/_headers'), 'utf8'),
  html
)
if (headers.split('\n').some((line) => line.length > 2000))
  throw new Error('Cloudflare header exceeds 2000 characters')
await writeFile(resolve(output, '_headers'), headers)
