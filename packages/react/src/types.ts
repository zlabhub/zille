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

export type LocationRecord<T extends string> = Record<T, string | string[]>

export interface LocationProps<P extends string = never, Q extends string = never> {
  pathname: string;
  query: Partial<LocationRecord<Q>>;
  params: Partial<LocationRecord<P>>;
  hash?: string,
}

export type LocationProvider = LocationProps<string, string> & {
  redirect: (url: string, type?: POPSTATE) => void,
  useEffect: typeof useEffect,
}

export type Newable<T = any> = {
  new(...args: any[]): T;
}