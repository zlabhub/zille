import { Exception } from './exception';

export interface RequestFetcherOptions {
  url: string;
  method: 'get' | 'post' | 'put' | 'delete';
  data?: any;
  headers?: Record<string, string>;
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
      default:
        return Promise.reject(new Exception(405, 'Method not allowed'));
    }

    return window.fetch(options.url, configs)
      .then(res => this.createResponse<T>(res))
      .catch(e => Promise.reject(
        e instanceof Exception
          ? e
          : new Exception(e.code || e.status || 500, e.message)
      ))
  }

  public get<T = any>(url: string, headers?: Record<string, string>) {
    return this.request<T>({
      url,
      method: 'get',
      headers,
    })
  }

  public post<T = any>(url: string, data?: any, headers?: Record<string, string>) {
    return this.request<T>({
      url,
      method: 'post',
      data,
      headers,
    })
  }

  public put<T = any>(url: string, data?: any, headers?: Record<string, string>) {
    return this.request<T>({
      url,
      method: 'put',
      data,
      headers,
    })
  }

  public delete<T = any>(url: string, headers?: Record<string, string>) {
    return this.request<T>({
      url,
      method: 'delete',
      headers,
    })
  }
}