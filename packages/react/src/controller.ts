import { ReactNode, FC, useEffect } from "react";
import { Meta } from "./meta";
import { useLocation } from "./window";
import { POPSTATE, _middleware, _render } from "./types";

export abstract class Controller<P extends string = never, Q extends string = never> {
  protected pathname: string | undefined;
  protected hash: string | undefined;
  protected query: Partial<Record<Q, string>> = {};
  protected params: Partial<Record<P, string>> = {};
  protected redirect: (url: string, type?: POPSTATE) => void = () => { };
  protected useEffect: typeof useEffect = () => { };

  protected abstract render(): ReactNode;

  static Middleware(...middlewares: FC[]) {
    return Meta.createClassDecorator(_middleware, ({ value }) => {
      const _value = value ?? [];
      return [..._value, ...middlewares];
    });
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