import { describe, expect, it } from 'vitest'
import { buildRuntime } from '../../../vite.config'
import { buildSiteHtml, scriptSafeJson } from '../exporter'
import { parseProject } from '../storage'
import { TEMPLATES } from '../templates'

describe('exported site', () => {
  it('escapes JSON so it cannot close the script tag', () => {
    expect(scriptSafeJson({ text: '</script><script>alert(1)</script>' })).not.toContain('</script')
  })

  it('embeds the runtime and project in a working standalone page', async () => {
    const project = TEMPLATES.find((t) => t.id === 'todo')!.create('My </script> app')
    const { code } = await buildRuntime()
    expect(code.length).toBeGreaterThan(1000)

    const html = buildSiteHtml(project, code)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html.match(/<\/script>/g)).toHaveLength(2)

    // Run the two inline scripts the way a browser would.
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const [runtimeScript, bootScript] = [...doc.querySelectorAll('script')].map((s) => s.textContent!)
    document.body.innerHTML = '<div id="app"></div>'
    const runtime = new Function(`${runtimeScript}; return NoCodeRuntime`)()
    expect(typeof runtime.mount).toBe('function')
    new Function('NoCodeRuntime', bootScript)(runtime)

    const app = document.getElementById('app')!
    expect(app.querySelectorAll('.nc-checkbox')).toHaveLength(3)
    expect(app.textContent).toContain('3 tasks in your list')
  }, 30_000)
})

describe('project import', () => {
  it('accepts exported projects and gives them a new id', () => {
    const project = TEMPLATES[1].create('Site')
    const imported = parseProject(JSON.parse(JSON.stringify(project)), true)
    expect(imported.id).not.toBe(project.id)
    expect(imported.pages).toHaveLength(project.pages.length)
    expect(imported.pages[0].root).toEqual(project.pages[0].root)
  })

  it('rejects files that are not projects', () => {
    expect(() => parseProject({ hello: 'world' }, true)).toThrow(/not a no-code project/)
    expect(() => parseProject({ pages: [{ root: { type: 'evil' } }] }, true)).toThrow(/unknown component/)
  })
})
