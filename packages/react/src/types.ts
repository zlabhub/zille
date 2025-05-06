import { useEffect } from 'react';

export const _render = Symbol('render');
export const _middleware = Symbol('middleware');

export enum POPSTATE {
  PUSH,
  REPLACE,
}

export enum MIDDLEWARE {
  GLOBAL,
  ROUTER,
}

export interface LocationProps<P extends string = never, Q extends string = never> {
  pathname: string;
  query: Partial<Record<Q, string>>;
  params: Partial<Record<P, string>>;
  hash?: string,
}

export type LocationProvider = LocationProps<string, string> & {
  redirect: (url: string, type?: POPSTATE) => void,
  useEffect: typeof useEffect,
}