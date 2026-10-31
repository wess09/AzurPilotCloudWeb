export function isAdminPreview(): boolean {
  return process.env.NODE_ENV === 'development' && typeof window !== 'undefined' &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname) &&
    new URLSearchParams(window.location.search).get('preview') === '1'
}
