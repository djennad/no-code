// Turns a project into files the user can download.

import { homePage } from '../runtime/app'
import type { Project } from '../runtime/types'

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** JSON that is safe to embed inside a <script> element. */
export function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * Builds a single, self-contained HTML file that runs the site. Every page is
 * included and reachable through #/path URLs.
 */
export function buildSiteHtml(project: Project, runtimeCode: string): string {
  const home = homePage(project)
  const title = escapeHtml(home.title || project.name)
  const background = project.theme.background.replace(/[^#\w(),.%\s-]/g, '')
  const runtime = runtimeCode.replace(/<\/script/gi, '<\\/script')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="generator" content="No-Code Studio">
<style>html,body{margin:0;padding:0;min-height:100%;background:${background}}#app{min-height:100vh}#app>.nc-app{min-height:100vh}</style>
</head>
<body>
<div id="app"></div>
<noscript>This site needs JavaScript to run.</noscript>
<script>${runtime}</script>
<script>NoCodeRuntime.mount(document.getElementById("app"), ${scriptSafeJson(project)}, { router: "hash" });</script>
</body>
</html>
`
}

export function fileName(project: Project, ext: string): string {
  const base = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project'
  return `${base}.${ext}`
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportSite(project: Project) {
  const { default: runtime } = await import('virtual:nocode-runtime')
  download(fileName(project, 'html'), buildSiteHtml(project, runtime), 'text/html')
}

export function exportProjectJson(project: Project) {
  download(fileName(project, 'nocode.json'), JSON.stringify(project, null, 2), 'application/json')
}
