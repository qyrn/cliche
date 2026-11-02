import { pathToFileURL } from 'node:url'
import { net, protocol } from 'electron'
import { resolveCapturePath } from './captureStore'

const CAPTURE_SCHEME = 'capture'

export function declareCaptureScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: CAPTURE_SCHEME, privileges: { standard: true, secure: true } }
  ])
}

export function serveCaptureFiles(): void {
  protocol.handle(CAPTURE_SCHEME, (request) => {
    try {
      const name = decodeURIComponent(new URL(request.url).pathname.slice(1))
      return net.fetch(pathToFileURL(resolveCapturePath(name)).toString())
    } catch {
      return new Response(null, { status: 404 })
    }
  })
}
