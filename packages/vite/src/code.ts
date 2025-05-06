export interface ZilleVitePluginCodeOptions {
  eager?: boolean,
  directory?: string,
  controllerSuffix?: string,
  controllerMetaSuffix?: string,
}
/**
 * 生成注入代码
 * @param options 
 * @param options.eager 是否急加载 default: false
 * @param options.directory 目录 default: controllers
 * @param options.suffix 后缀 default: .controller.tsx
 * @returns 
 */
export function makeInjectionCode(options: ZilleVitePluginCodeOptions = {}) {
  const {
    eager = false,
    directory = 'controllers',
    controllerSuffix = '.controller.tsx',
    controllerMetaSuffix = '.meta.ts',
  } = options;

  const eagerValue = (!!eager).toString();

  return `import { addRoute, setWindowEager, setWindowBaseURL, addControllerMetadata } from '@zille/react';
const controllers = import.meta.glob('./${directory}/**/*${controllerSuffix}', {
  eager: ${eagerValue},
  import: 'default',
});
const metas = import.meta.glob('./${directory}/**/*${controllerMetaSuffix}', {
  eager: true,
  import: 'default',
});
Object.entries(controllers).forEach(([path, fn]) => {
  const url = path.slice('./${directory}'.length, '${controllerSuffix}'.length * -1).replace(/\\/index$/, '') || '/';
  const route = url.replace(/\\[\\.\\.\\.([^\\]]+)\\]/g, '**:$1').replace(/\\[([^\\]]+)\\]/g, ':$1');
  addRoute(route, fn);
});
Object.entries(metas).forEach(([path, meta]) => {
  const url = path.slice('./${directory}'.length, '${controllerMetaSuffix}'.length * -1).replace(/\\/index$/, '') || '/';
  const route = url.replace(/\\[\\.\\.\\.([^\\]]+)\\]/g, '*$1').replace(/\\[([^\\]]+)\\]/g, ':$1');
  addControllerMetadata(meta, new meta(route));
});
setWindowEager(${eagerValue});
setWindowBaseURL(import.meta.env.BASE_URL);`
}