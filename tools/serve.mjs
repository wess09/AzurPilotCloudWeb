// Serve the exported artifacts with the same global CSP as Cloudflare Pages.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
const target = process.argv[2],
  port = Number(process.argv[3])
if (!['stats', 'admin'].includes(target) || !port)
  throw new Error('Usage: node tools/serve.mjs stats|admin port')
const root = resolve('dist', target)
const headers = Object.fromEntries(
  (await readFile(resolve(root, '_headers'), 'utf8'))
    .split('\n')
    .filter((line) => line.startsWith('  '))
    .slice(0, -1)
    .map((line) => {
      const colon = line.indexOf(':')
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()]
    })
)
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname
    )
    let file = resolve(root, '.' + path)
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403)
      res.end()
      return
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html')
    res.writeHead(200, {
      ...headers,
      'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8`
    })
    res.end(await readFile(file))
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
}).listen(port, '127.0.0.1', () =>
  process.stdout.write(`Serving ${target} on http://127.0.0.1:${port}\n`)
)
