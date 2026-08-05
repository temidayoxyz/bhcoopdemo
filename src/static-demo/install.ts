import { handleMockApi } from './mockApi';

/**
 * Cooperative state lives in the browser so member and staff portals
 * always share one ledger and balances on this device.
 */
export function installStaticDemoFetch() {
  if (typeof window === 'undefined') return;
  if ((window as any).__seedcoopApiInstalled) return;
  (window as any).__seedcoopApiInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    const isApi =
      url.includes('/api/') ||
      url.startsWith('/api') ||
      url.startsWith('api/');

    if (isApi) {
      return handleMockApi(input, init);
    }
    return originalFetch(input, init);
  };
}
