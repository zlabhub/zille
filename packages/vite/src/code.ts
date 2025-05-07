export interface ZilleVitePluginCodeOptions {
  eager?: boolean,
  controllerDirectory?: string,
  controllerSuffix?: string,
  controllerMetaSuffix?: string,
  service?: boolean,
  serviceDirectory?: string,
}
/**
 * 生成注入代码
 * @param options 
 * @param options.eager 是否急加载 default: false
 * @param options.controllerDirectory 目录 default: controllers
 * @param options.controllerSuffix 控制器后缀 default: .controller.tsx
 * @param options.controllerMetaSuffix 控制器元数据后缀 default: .meta.ts
 * @param options.service 是否生成服务 default: false
 * @param options.serviceDirectory 服务目录 default: services
 * @returns 
 */
export function makeInjectionCode(options: ZilleVitePluginCodeOptions = {}) {
  const {
    eager = false,
    controllerDirectory = 'controllers',
    controllerSuffix = '.controller.tsx',
    controllerMetaSuffix = '.meta.ts',
    service = false,
    serviceDirectory = 'services',
  } = options;

  const eagerValue = (!!eager).toString();
  const serviceCode = service ? makeServiceCode(serviceDirectory) : '';

  return `import { addRoute, setWindowEager, setWindowBaseURL, addControllerMetadata } from '@zille/react';
const controllers = import.meta.glob('./${controllerDirectory}/**/*${controllerSuffix}', {
  eager: ${eagerValue},
  import: 'default',
});
const metas = import.meta.glob('./${controllerDirectory}/**/*${controllerMetaSuffix}', {
  eager: true,
  import: 'default',
});
Object.entries(controllers).forEach(([path, fn]) => {
  const url = path.slice('./${controllerDirectory}'.length, '${controllerSuffix}'.length * -1).replace(/\\/index$/, '') || '/';
  const route = url.replace(/\\[\\.\\.\\.([^\\]]+)\\]/g, '**:$1').replace(/\\[([^\\]]+)\\]/g, ':$1');
  addRoute(route, fn);
});
Object.entries(metas).forEach(([path, meta]) => {
  const url = path.slice('./${controllerDirectory}'.length, '${controllerMetaSuffix}'.length * -1).replace(/\\/index$/, '') || '/';
  const route = url.replace(/\\[\\.\\.\\.([^\\]]+)\\]/g, '*$1').replace(/\\[([^\\]]+)\\]/g, ':$1');
  addControllerMetadata(meta, new meta(route));
});
setWindowEager(${eagerValue});
setWindowBaseURL(import.meta.env.BASE_URL);${serviceCode}`
}

function makeServiceCode(directory: string) {
  return `\nimport { service } from '@zille/request';
const services = import.meta.glob('./${directory}/**/*.service.ts', {
  eager: true,
  import: 'default',
});
Object.entries(services).forEach(([path, fn]) => {
  const url = path.slice('./${directory}'.length + 1, '.service.ts'.length * -1).replace(/\\/index$/, '') || '';
  const sp = url.split('/');
  let target = service;
  for (let i = 0; i < sp.length; i++) {
    const name = sp[i];
    if (i === sp.length - 1) {
      target[name] = new fn();
    } else {
      if (!target[name]) {
        target[name] = {};
      }
      target = target[name];
    }
  }
});`
}