export function uid(prefix = 'n'): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${random}${Date.now().toString(36).slice(-3)}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
