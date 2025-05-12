import { ReactNode, FC, useEffect, useMemo } from "react";
import { Meta } from "./meta";
import { useLocation } from "./window";
import { POPSTATE, _middleware, _render, LocationRecord } from "./types";
import { PathFunction, compile, match, MatchFunction } from 'path-to-regexp';
import { stringify } from 'qs';

export abstract class Controller<P extends string = never, Q extends string = never> {
  protected pathname: string | undefined;
  protected hash: string | undefined;
  protected query: Partial<LocationRecord<Q>> = {};
  protected params: Partial<LocationRecord<P>> = {};
  protected redirect: (url?: string, type?: POPSTATE) => void = () => { };
  protected useEffect: typeof useEffect = () => { };

  protected abstract render(): ReactNode;

  static Middleware(...middlewares: FC[]) {
    return Meta.createClassDecorator(_middleware, ({ value }) => {
      const _value = value ?? [];
      return [..._value, ...middlewares];
    });
  }

  public useComponent<P = {}>(fn: FC<P>): FC<P> {
    return useMemo(() => fn.bind(this), []);
  }

  public [_render]() {
    return () => {
      const location = useLocation();
      this.pathname = location.pathname;
      this.hash = location.hash;
      this.query = location.query;
      this.params = location.params;
      this.redirect = location.redirect;
      this.useEffect = location.useEffect;
      return this.render();
    }
  }
}

class LocationMetadata<P extends string = never, Q extends string = never> {
  private _params: Partial<LocationRecord<P>> = {};
  private _query: Partial<LocationRecord<Q>> = {};
  private _hash: string | undefined;
  constructor(private readonly meta: ControllerMetadata<P, Q>) { }
  public params(data: Partial<LocationRecord<P>>) {
    this._params = data;
    return this;
  }

  public query(data: Partial<LocationRecord<Q>>) {
    this._query = data;
    return this;
  }

  public hash(data: string) {
    this._hash = data;
    return this;
  }

  public toString() {
    const _path = this.meta._toPath(this._params as Record<P, string>);
    const _query = stringify(this._query);
    return _path + (_query ? `?${_query}` : '') + (this._hash ? `#${this._hash}` : '');
  }
}

export class ControllerMetadata<P extends string = never, Q extends string = never> {
  public readonly _toPath: PathFunction<LocationRecord<P>>;
  public readonly _toMatch: MatchFunction<LocationRecord<Q>>;
  constructor(public readonly metaId: string) {
    this._toPath = compile(metaId);
    this._toMatch = match(metaId);
  }

  public location() {
    return new LocationMetadata<P, Q>(this);
  }

  public match(path: string) {
    return this._toMatch(path);
  }
}