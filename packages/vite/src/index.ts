import type { PluginOption } from 'vite';
import { makeInjectionCode } from './code';

export function createZilleVitePlugin(options: {
  directory?: string,
  suffix?: string,
  eager?: boolean,
  entry?: string,
} = {}): PluginOption {
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