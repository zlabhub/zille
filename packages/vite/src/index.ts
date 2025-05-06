import type { PluginOption } from 'vite';
import { makeInjectionCode, ZilleVitePluginCodeOptions } from './code';

export interface ZilleVitePluginOptions extends ZilleVitePluginCodeOptions {
  entry?: string,
}

export function createZilleVitePlugin(options: ZilleVitePluginOptions = {}): PluginOption {
  const { entry = 'src/main.tsx', ...rest } = options;
  const syscode = makeInjectionCode(rest);
  return {
    name: 'vite-plugin-zille',
    transform(code, id) {
      const normalizedId = id.replace(/\\\\/g, '/');
      if (normalizedId.endsWith(entry)) {
        return {
          code: `${syscode}\n${code}`,
        };
      }
    },
  }
}

export default createZilleVitePlugin;