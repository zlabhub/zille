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
  routes: Set<() => void>,

  // metaid -> middlewares
  // 通过metaid获取控制器中间件集合
  controllerMiddlewares: Map<string, FC<any>[]>,

  // metaid -> controller:FC
  // 通过metaid获取控制器编译后的组件对象
  controllerCaches: Map<string, FC<any>>,

  // class -> metadata
  // 通过控制器类获取控制器信息元数据
  controllerMetadatas: Map<Newable, ControllerMetadata<any, any>>,

  // metaid -> class
  // 通过metaid获取控制器的构造器
  controllerMaps: Map<string, Newable>,
}