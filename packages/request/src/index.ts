import { Exception } from './exception';
import {
  useCallback,
  useState,
  useRef,
  useEffect,
  DependencyList,
  PropsWithChildren,
  FC,
  useMemo,
  createElement,
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
} from 'react';

export * from './exception';
export * from './fetcher';

const RequestListeners = new Map<string | number, FC>();

export interface RequestService { }
export const service: RequestService = {}

export function useSubmit<U extends any[], T>(fn: (...args: U) => Promise<T>) {
  const [loading, setLoading] = useState(false);
  const { post } = useRequestContext();
  const submit = useCallback(async (...args: U) => {
    setLoading(true);
    return fn(...args).catch(e => {
      post(e);
      return Promise.reject(e);
    }).finally(() => setLoading(false));
  }, [fn, setLoading]);
  return { loading, submit };
}

export function useRequest<T>(fn: () => Promise<T>, refreshDeps: DependencyList = []) {
  const { post } = useRequestContext();
  const [data, setData] = useState<T | null>();
  const [error, setError] = useState<any>();
  const { submit, loading } = useSubmit(fn);
  const refresh = useCallback(() => {
    submit().then(setData).catch(e => {
      post(e);
      setError(e);
    });
  }, [submit, setData, setError, post]);
  useEffect(refresh, refreshDeps);
  return { loading, data, error, setData, setError, refresh };
}

export function useAbortableRequest<T>(fn: (signal: AbortSignal) => Promise<T>, refreshDeps: DependencyList = []) {
  const controller = useRef<AbortController>(null);
  const res = useRequest(() => {
    controller.current = new AbortController();
    return fn(controller.current.signal)
      .finally(() => controller.current = null);
  }, refreshDeps);
  useEffect(() => () => controller.current?.abort(), []);
  return {
    ...res,
    controller: controller.current,
  }
}

export function useAbortableIntersectionRequest<T>(fn: (signal: AbortSignal) => Promise<T>, refreshDeps: DependencyList = []) {
  const controller = useRef<AbortController>(null);
  const res = useIntersectionRequest(() => {
    controller.current = new AbortController();
    return fn(controller.current.signal)
      .finally(() => controller.current = null);
  }, refreshDeps);
  useEffect(() => () => controller.current?.abort(), []);
  return {
    ...res,
    controller: controller.current,
  }
}

export function useIntersectionRequest<T>(fn: () => Promise<T>, refreshDeps: DependencyList = []) {
  const [data, setData] = useState<T | null>();
  const [error, setError] = useState<any>();
  const componentRef = useRef(null);
  const First = useRef(true);
  const { submit, loading } = useSubmit(fn);
  const { post } = useRequestContext();
  const _submit = useCallback(() => {
    submit()
      .then(setData)
      .catch(e => {
        post(e);
        setError(e);
      })
      .finally(() => First.current = false)
  }, [submit, setData, setError, post]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          _submit();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (componentRef.current) {
      observer.observe(componentRef.current);
    }

    return () => {
      if (componentRef.current) {
        observer.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (!First.current) {
      _submit();
    }
  }, refreshDeps);

  return {
    loading,
    data, error, setData, setError,
    refresh: _submit,
    ref: componentRef,
  }
}

export function addListener(key: string | number, listener: FC) {
  RequestListeners.set(key, listener);
  return () => RequestListeners.delete(key);
}

const RequestContext = createContext<{
  post: Dispatch<SetStateAction<Exception>>,
  clear: () => void
}>({
  post: () => { },
  clear: () => { }
});

export function RequestProvider(props: PropsWithChildren) {
  const [error, setError] = useState<Exception>();
  const Page = useMemo(() => {
    if (error instanceof Exception) {
      const status = error.status;
      if (RequestListeners.has(status)) {
        return RequestListeners.get(status)
      }
    }
  }, [error]);

  const post = useCallback((error: any) => {
    if (error instanceof Exception) {
      const status = error.status;
      if (RequestListeners.has(status)) {
        setError(error);
        return true;
      }
    }
    return false;
  }, [setError]);

  const clear = useCallback(() => setError(undefined), [setError]);

  return createElement(RequestContext.Provider, {
    value: { post, clear }
  }, Page ? createElement(Page) : props.children);
}

export function useRequestContext() {
  return useContext(RequestContext);
}