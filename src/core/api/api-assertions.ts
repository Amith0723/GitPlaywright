import { APIResponse, expect } from '@playwright/test';

export class ApiAssertions {
  static async assertStatus(response: APIResponse, expectedStatus: number): Promise<void> {
    expect(response.status(), `Expected HTTP status ${expectedStatus} but received ${response.status()}`).toBe(expectedStatus);
  }

  static async assertJsonContains(response: APIResponse, key: string): Promise<void> {
    const json = await response.json();
    expect(json).toHaveProperty(key);
  }
}
