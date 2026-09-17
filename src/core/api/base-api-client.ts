import { APIRequestContext, APIResponse, request } from '@playwright/test';

export class BaseApiClient {
  protected requestContext?: APIRequestContext;
  readonly baseUrl: string;

  constructor(requestContext?: APIRequestContext, baseUrl = 'https://devbiz.zylu.co') {
    this.requestContext = requestContext;
    this.baseUrl = baseUrl;
  }

  private async getContext(): Promise<APIRequestContext> {
    if (!this.requestContext) {
      this.requestContext = await request.newContext({ baseURL: this.baseUrl });
    }
    return this.requestContext;
  }

  async get(endpoint: string, headers: Record<string, string> = {}): Promise<APIResponse> {
    const ctx = await this.getContext();
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return await ctx.get(url, { headers });
  }

  async post(endpoint: string, data: any = {}, headers: Record<string, string> = {}): Promise<APIResponse> {
    const ctx = await this.getContext();
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return await ctx.post(url, { data, headers });
  }

  async put(endpoint: string, data: any = {}, headers: Record<string, string> = {}): Promise<APIResponse> {
    const ctx = await this.getContext();
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return await ctx.put(url, { data, headers });
  }

  async patch(endpoint: string, data: any = {}, headers: Record<string, string> = {}): Promise<APIResponse> {
    const ctx = await this.getContext();
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return await ctx.patch(url, { data, headers });
  }

  async delete(endpoint: string, headers: Record<string, string> = {}): Promise<APIResponse> {
    const ctx = await this.getContext();
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return await ctx.delete(url, { headers });
  }
}
