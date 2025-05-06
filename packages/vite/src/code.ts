/**
 * 生成注入代码
 * @param options 
 * @param options.eager 是否急加载 default: false
 * @param options.directory 目录 default: controllers
 * @param options.suffix 后缀 default: .controller.tsx
 * @returns 
 */
export function makeInjectionCode(options: {
  eager?: boolean,
  directory?: string,
  suffix?: string,
} = {}) {
  const {
    eager = false,
    directory = 'controllers',
    suffix = '.controller.tsx',
  } = options;

  const eagerValue = (!!eager).toString();

  return `import { addRoute, setWindowEager, setWindowBaseURL } from '@zille/react';
const glob = import.meta.glob('./${directory}/**/*${suffix}', {
  eager: ${eagerValue},
  import: 'default',
});
Object.entries(glob).forEach(([path, fn]) => {
  const url = path.slice('./${directory}'.length, '${suffix}'.length * -1).replace(/\\/index$/, '') || '/';
  const route = url.replace(/\\[\\.\\.\\.([^\\]]+)\\]/g, '**:$1').replace(/\\[([^\\]]+)\\]/g, ':$1');
  addRoute(route, fn);
});
setWindowEager(${eagerValue});
setWindowBaseURL(import.meta.env.BASE_URL);`
}