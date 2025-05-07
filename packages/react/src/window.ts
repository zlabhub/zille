import mitt from 'mitt';
import { LocationProps, LocationRecord } from "./types"
import { parse } from 'qs';
import { Controller, ControllerMetadata } from "./controller";
import { Meta } from "./meta";
import { POPSTATE, _middleware, _render, Newable, WindowContextProps } from './types';
import { createRouter, addRoute as addRouter, findRoute, removeRoute } from 'rou3';
import {
  createContext,
  createElement,
  FC,
  lazy,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  Suspense,
  ReactNode,
  Fragment,
} from 'react';

type IMiddle = { component: FC<any>, props: any };

const WindowContext: WindowContextProps = {
  baseURL: '/',
  eager: false,
  event: mitt(),
  controllerMetadatas: new Map(),
  routes: new Set(),
  controllerMiddlewares: new Map(),
  controllerCaches: new Map(),
  router: createRouter(),
  controllerMaps: new Map(),
  defaultLocation: {
    pathname: '/',
    query: getWindowLocationQuery(),
    params: {},
    hash: getWindowLocationHash(),
  }
}

// 窗口上下文提供者
const WindowContextProvider = createContext<LocationProps<string, string> & {
  redirect: (url?: string, type?: POPSTATE) => void,
  useEffect: typeof useEffect,
  metaId: string | null,
}>({
  ...WindowContext.defaultLocation,
  redirect: () => { },
  useEffect: () => { },
  metaId: null,
});

// 获取窗口路径
function getWindowLocationPathname() {
  let pathname = window.location.pathname;
  if (!pathname.startsWith(WindowContext.baseURL)) {
    throw new Error(`pathname must start with baseURL: ${WindowContext.baseURL}`);
  }
  pathname = pathname.substring(WindowContext.baseURL.length);
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }
  return pathname;
}

// 获取窗口哈希
function getWindowLocationHash() {
  return window.location.hash;
}

// 获取窗口查询
function getWindowLocationQuery() {
  return parse(window.location.search, {
    ignoreQueryPrefix: true,
  }) as Partial<LocationRecord<string>>;
}

// 设置窗口基础 URL
export function setWindowBaseURL(baseURL: string = '/') {
  if (!baseURL || !baseURL.endsWith('/')) {
    throw new Error('baseURL must be a valid URL and end with a slash');
  }
  WindowContext.baseURL = baseURL;
}

// 设置窗口急加载
export function setWindowEager(eager: boolean) {
  WindowContext.eager = eager;
}

// 获取窗口急加载
export function getWindowEager() {
  return WindowContext.eager;
}

// 获取窗口提供者
export function useLocation() {
  return useContext(WindowContextProvider);
}

// 添加控制器元数据
export function addControllerMetadata<T extends ControllerMetadata>(clazz: Newable<T>, data: T) {
  WindowContext.controllerMetadatas.set(clazz, data);
  WindowContext.controllerMaps.set(data.metaId, clazz);
}

// 通过控制器类获取控制器元数据
export function getControllerMetadata<
  P extends string,
  Q extends string,
  T extends ControllerMetadata<P, Q>,
>(clazz: Newable<T>): T | undefined {
  if (WindowContext.controllerMetadatas.has(clazz)) {
    return WindowContext.controllerMetadatas.get(clazz)! as T;
  }
}

// 通过表达式获取控制器元数据
export function getControllerMetadataByExpression<T extends ControllerMetadata = any>(expression: string): Newable<T> | undefined {
  if (WindowContext.controllerMaps.has(expression)) {
    return WindowContext.controllerMaps.get(expression)! as Newable<T>;
  }
}

// 添加路由
export function addRoute(path: string, fn: (() => Promise<unknown>) | unknown) {
  addRouter(WindowContext.router, 'GET', path, {
    payload: fn,
    expression: path,
  });
  const remove = () => {
    removeRoute(WindowContext.router, 'GET', path);
    WindowContext.routes.delete(remove);
  }
  WindowContext.routes.add(remove);
  return remove;
}

// 窗口提供者
export function WindowProvider(props: PropsWithChildren<{
  fallback?: ReactNode,
  globalMiddlewares?: FC[],
  routerMiddlewares?: FC[],
}>) {
  const [isPending, startTransition] = useTransition();
  const [pathname, setPathname] = useState(WindowContext.defaultLocation.pathname);
  const [hash, setHash] = useState(WindowContext.defaultLocation.hash);
  const [query, setQuery] = useState<Partial<LocationRecord<string>>>(WindowContext.defaultLocation.query);
  const [params, setParams] = useState<Partial<LocationRecord<string>>>(WindowContext.defaultLocation.params);
  const [metaId, setMetaId] = useState<string | null>(null);
  const [node, setNode] = useState<ReactNode>();
  const [middlewares, setMiddlewares] = useState<IMiddle[]>([]);

  const redirect = useCallback((url?: string, type: POPSTATE = POPSTATE.PUSH) => {
    if (url) {
      if (!url.startsWith(WindowContext.baseURL)) {
        const _url = url.startsWith('/') ? url.substring(1) : url;
        url = WindowContext.baseURL + _url;
      }
      if (type === POPSTATE.PUSH) {
        window.history.pushState({}, '', url);
      } else {
        window.history.replaceState({}, '', url);
      }
      WindowContext.event.emit('location');
    }
  }, [])

  const useContextEffect: typeof useEffect = (fn, deps) => useEffect(() => {
    if (!isPending) {
      return fn();
    }
  }, deps)

  useEffect(() => {
    const emitter = () => WindowContext.event.emit('location');
    const handler = () => {
      const pathname = getWindowLocationPathname();
      const matched = findRoute(WindowContext.router, 'GET', pathname, { params: true });
      let _params: Partial<LocationRecord<string>> = matched?.params ?? {};
      let _middlewares: IMiddle[] = [];
      let _node: ReactNode = null;
      let expression: string | null = null;
      if (matched) {
        const handler = matched.data.payload;
        expression = matched.data.expression;
        if (!WindowContext.controllerCaches.has(expression)) {
          if (WindowContext.eager) {
            // 直接 controller 模式
            const controller = handler as { new(): Controller };
            const meta = Meta.get(controller);
            const middlewares: FC[] = meta.clazz.get(_middleware) ?? [];
            const component = new controller()[_render]();
            WindowContext.controllerMiddlewares.set(expression, middlewares);
            WindowContext.controllerCaches.set(expression, component);
          } else {
            const Comp = lazy(async () => {
              const control = await (handler as () => Promise<{ new(): Controller }>)();
              const meta = Meta.get(control);
              const middlewares: FC[] = meta.clazz.get(_middleware) ?? [];
              const controller = new control();
              const component = controller[_render]();
              const newComponent: FC & { isLazy?: boolean } = () => {
                return [...middlewares, component].reverse().reduce(
                  (prev, next) => createElement(next, {}, prev),
                  createElement(Fragment),
                )
              }
              newComponent.isLazy = true;
              WindowContext.controllerMiddlewares.set(expression!, middlewares);
              WindowContext.controllerCaches.set(expression!, component);
              return { default: newComponent };
            })
            WindowContext.controllerCaches.set(expression, Comp);
          }
        }
        const component = WindowContext.controllerCaches.get(expression)!;
        const middlewares = WindowContext.controllerMiddlewares.get(expression) ?? [];
        _middlewares = [
          ...(props.globalMiddlewares ?? []),
          ...(props.routerMiddlewares ?? []),
          ...middlewares,
        ].map(component => ({ component, props: {} }));
        // @ts-ignore
        if (!WindowContext.eager && component.isLazy) {
          _middlewares.push({ component: Suspense, props: { fallback: props.fallback } })
        }
        _middlewares.push({ component, props: {} });
        _middlewares = _middlewares.reverse();
        _node = null;
      } else {
        _middlewares = [
          ...(props.globalMiddlewares ?? []),
        ].map(component => ({ component, props: {} })).reverse();
        _node = props.children;
      }

      startTransition(() => {
        setPathname(pathname);
        setHash(getWindowLocationHash());
        setQuery(getWindowLocationQuery());
        setParams(_params);
        setMiddlewares(_middlewares);
        setNode(_node);
        setMetaId(expression);
      })
    }

    WindowContext.event.on('location', handler);
    window.addEventListener('popstate', emitter);

    handler();

    return () => {
      window.removeEventListener('popstate', emitter);
      WindowContext.event.off('location', handler);
    }
  }, []);

  return middlewares.concat([
    {
      component: WindowContextProvider.Provider,
      props: {
        value: {
          metaId, pathname, query, params, hash, redirect,
          useEffect: useContextEffect,
        }
      }
    },
  ]).reduce((prev, next) => createElement(next.component, next.props, prev), node)
}