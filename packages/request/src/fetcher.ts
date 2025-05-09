import { Exception } from './exception';

export interface RequestFetcherOptions {
  url: string;
  method: 'get' | 'post' | 'put' | 'delete';
  data?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class Fetcher {
  constructor(private readonly handler?: Function) { }
  private async createResponse<T>(res: Response) {
    if (res.status < 200 || res.status >= 300 || !res.ok) {
      throw new Exception(res.status, res.statusText)
    }

    const response = await res.json();
    let data: T = response;

    if (this.handler) {
      data = this.handler(response);
    }

    return {
      data,
      headers: res.headers,
    }
  }

  private request<T = any>(options: RequestFetcherOptions) {
    const configs: RequestInit = {
      method: options.method,
      headers: options.headers ?? {},
      signal: options.signal,
      credentials: 'include',
    };

    switch (configs.method) {
      case 'post':
      case 'put':
        configs.body = JSON.stringify(options.data);
        configs.headers = {
          ...configs.headers,
          'content-type': 'application/json',
        };
        break;
    }

    return window.fetch(options.url, configs)
      .then(res => this.createResponse<T>(res))
      .catch(e => Promise.reject(
        e instanceof Exception
          ? e
          : new Exception(e.code || e.status || 500, e.message)
      ))
  }

  public get<T = any>(options: Omit<RequestFetcherOptions, 'method' | 'data'>) {
    return this.request<T>({
      ...options,
      method: 'get',
    })
  }

  public post<T = any>(options: Omit<RequestFetcherOptions, 'method'>) {
    return this.request<T>({
      ...options,
      method: 'post',
    })
  }

  public put<T = any>(options: Omit<RequestFetcherOptions, 'method'>) {
    return this.request<T>({
      ...options,
      method: 'put',
    })
  }

  public delete<T = any>(options: Omit<RequestFetcherOptions, 'method' | 'data'>) {
    return this.request<T>({
      ...options,
      method: 'delete',
    })
  }
}