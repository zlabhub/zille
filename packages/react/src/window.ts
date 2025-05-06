import { LocationProps } from "./types"
import mitt, { Emitter } from 'mitt';
import { parse } from 'qs';
import { Controller } from "./controller";
import { Meta } from "./meta";
import { MIDDLEWARE, POPSTATE, _middleware, _render } from './types';
import { createRouter, RouterContext, addRoute as addRouter, findRoute, removeRoute } from 'rou3';
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

const WindowContext: {
  baseURL: string,
  eager?: boolean,
  router: RouterContext<{ payload: (() => Promise<{ new(): Controller }>) | { new(): Controller }, expression: string }>,
  event: Emitter<{ location: undefined }>,
  defaultLocation: LocationProps<string, string>,
  globalMiddlewares: FC<any>[],
  routerMiddlewares: FC<any>[],
  controllerMiddlewares: Map<string, FC<any>[]>,
  controllerCaches: Map<string, FC<any>>,
  routes: Set<() => void>,
} = {
  baseURL: '/',
  eager: false,
  event: mitt(),
  routes: new Set(),
  globalMiddlewares: [],
  routerMiddlewares: [],
  controllerMiddlewares: new Map(),
  controllerCaches: new Map(),
  router: createRouter(),
  defaultLocation: {
    pathname: '/',
    query: getWindowLocationQuery(),
    params: {},
    hash: getWindowLocationHash(),
  }
}

const WindowContextProvider = createContext<LocationProps<string, string> & {
  redirect: (url: string, type?: POPSTATE) => void,
  useEffect: typeof useEffect,
}>({
  ...WindowContext.defaultLocation,
  redirect: () => { },
  useEffect: () => { },
});

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

function getWindowLocationHash() {
  return window.location.hash;
}

function getWindowLocationQuery() {
  return parse(window.location.search, {
    ignoreQueryPrefix: true,
  }) as Partial<Record<string, string>>;
}

export function setWindowBaseURL(baseURL: string = '/') {
  if (!baseURL || !baseURL.endsWith('/')) {
    throw new Error('baseURL must be a valid URL and end with a slash');
  }
  WindowContext.baseURL = baseURL;
}

export function setWindowEager(eager: boolean) {
  WindowContext.eager = eager;
}

export function useLocation() {
  return useContext(WindowContextProvider);
}

export function addMiddleware<P>(type: MIDDLEWARE, middleware: FC<P>) {
  switch (type) {
    case MIDDLEWARE.GLOBAL:
      WindowContext.globalMiddlewares.push(middleware);
      break;
    case MIDDLEWARE.ROUTER:
      WindowContext.routerMiddlewares.push(middleware);
      break;
  }
}

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

export function dispose() {
  for (const remove of WindowContext.routes.values()) {
    remove();
  }
  WindowContext.routes.clear();
}

export function WindowProvider(props: PropsWithChildren<{
  fallback?: ReactNode,
}>) {
  const [isPending, startTransition] = useTransition();
  const [pathname, setPathname] = useState(WindowContext.defaultLocation.pathname);
  const [hash, setHash] = useState(WindowContext.defaultLocation.hash);
  const [query, setQuery] = useState<Partial<Record<string, string>>>(WindowContext.defaultLocation.query);
  const [params, setParams] = useState<Partial<Record<string, string>>>({});
  const [node, setNode] = useState<ReactNode>();
  const [middlewares, setMiddlewares] = useState<IMiddle[]>([]);

  const redirect = useCallback((url: string, type: POPSTATE = POPSTATE.PUSH) => {
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
      let _params: Partial<Record<string, string>> = matched?.params ?? {};
      if (matched) {
        const handler = matched.data.payload;
        const expression = matched.data.expression;
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
              WindowContext.controllerMiddlewares.set(expression, middlewares);
              WindowContext.controllerCaches.set(expression, component);
              return { default: newComponent };
            })
            WindowContext.controllerCaches.set(expression, Comp);
          }
        }
        const component = WindowContext.controllerCaches.get(expression)!;
        const middlewares = WindowContext.controllerMiddlewares.get(expression) ?? [];
        const _middlewares: IMiddle[] = [
          ...WindowContext.globalMiddlewares,
          ...WindowContext.routerMiddlewares,
          ...middlewares,
        ].map(component => ({ component, props: {} }));
        // @ts-ignore
        if (!WindowContext.eager && component.isLazy) {
          _middlewares.push({ component: Suspense, props: { fallback: props.fallback } })
        }
        _middlewares.push({ component, props: {} });
        setMiddlewares(_middlewares.reverse());
        setNode(null);
      } else {
        setMiddlewares([...WindowContext.globalMiddlewares].map(component => ({ component, props: {} })).reverse());
        setNode(props.children);
      }

      startTransition(() => {
        setPathname(pathname);
        setHash(getWindowLocationHash());
        setQuery(getWindowLocationQuery());
        setParams(_params);
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
          pathname, query, params, hash, redirect,
          useEffect: useContextEffect,
        }
      }
    },
  ]).reduce((prev, next) => createElement(next.component, next.props, prev), node)
}