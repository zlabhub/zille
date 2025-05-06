import { useEffect, FC } from 'react';
import { Emitter } from 'mitt';
import { Controller, ControllerMetadata } from "./controller";
import { RouterContext } from 'rou3';

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

export interface WindowContextProps {
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
  controllerMetadatas: Map<Newable, ControllerMetadata<any, any>>,
}