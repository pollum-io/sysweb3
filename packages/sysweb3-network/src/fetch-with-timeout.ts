import { memoize } from 'lodash';
import fetch from 'node-fetch';

export const getFetchWithTimeout = memoize((timeout: number) => {
  if (!Number.isInteger(timeout) || timeout < 1) {
    throw new Error('Must specify positive integer timeout.');
  }

  const _fetch = async (url: string, opts: any) => {
    const abortController = new window.AbortController();

    const { signal } = abortController;

    const response = await fetch(url, {
      ...opts,
      signal,
    });

    const timer = setTimeout(() => abortController.abort(), timeout);

    try {
      clearTimeout(timer);

      return response;
    } catch (error) {
      clearTimeout(timer);

      throw error;
    }
  };

  const _nodeFetch = async (url: string, opts: any) => {
    const abortController = new AbortController();

    const { signal } = abortController;

    const nodeFetch = fetch(url, {
      ...opts,
      signal,
    });

    const timer = setTimeout(() => abortController.abort(), timeout);

    try {
      const response = await nodeFetch;

      clearTimeout(timer);

      return response;
    } catch (error) {
      clearTimeout(timer);

      throw error;
    }
  };

  if (typeof window !== 'undefined') return _fetch;

  return _nodeFetch;
});
