/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, defineConfig, type Plugin } from 'vite'

const RUNTIME_ID = 'virtual:nocode-runtime'
const RESOLVED_RUNTIME_ID = '\0' + RUNTIME_ID
const RUNTIME_ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), 'src/runtime/standalone.ts')

/** Builds the runtime as a standalone script and exposes its code as a string. */
export async function buildRuntime(): Promise<{ code: string; modules: string[] }> {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: true,
      lib: { entry: RUNTIME_ENTRY, name: 'NoCodeRuntime', formats: ['iife'], fileName: () => 'runtime.js' },
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  for (const output of outputs) {
    if (!('output' in output)) continue
    const chunk = output.output.find((o) => o.type === 'chunk')
    if (chunk && chunk.type === 'chunk') return { code: chunk.code, modules: chunk.moduleIds ?? [] }
  }
  throw new Error('Runtime build produced no output')
}

/**
 * `import code from 'virtual:nocode-runtime'` gives the runtime bundle that is
 * embedded into exported sites.
 */
function runtimeBundle(): Plugin {
  return {
    name: 'nocode-runtime-bundle',
    resolveId(id) {
      return id === RUNTIME_ID ? RESOLVED_RUNTIME_ID : undefined
    },
    async load(id) {
      if (id !== RESOLVED_RUNTIME_ID) return
      const { code, modules } = await buildRuntime()
      for (const file of modules) if (!file.startsWith('\0')) this.addWatchFile(file)
      return `export default ${JSON.stringify(code)}`
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), runtimeBundle()],
  test: {
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        settings: {
          disableCSSFileLoading: true,
          disableJavaScriptFileLoading: true,
          disableIframePageLoading: true,
          handleDisabledFileLoadingAsSuccess: true,
        },
      },
    },
  },
})
