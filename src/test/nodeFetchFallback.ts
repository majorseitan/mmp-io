/**
 * Node HTTP/HTTPS fallback for fetch in test environments
 * Use this when global fetch is not available or blocked by test setup
 */

export const createNodeFetchFallback = (logPrefix = '[fetch]') => {
  const nodeFetchFallback = async (input: any, init?: any) => {
    const urlStr = typeof input === 'string' ? input : input?.url ?? String(input);
    
    // Log request body if present
    if (init && init.body) {
      try {
        const bodyPreview = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
        const preview = bodyPreview.length > 200 ? bodyPreview.substring(0, 200) + '...' : bodyPreview;
        console.log(`${logPrefix} node request body ->`, preview);
      } catch (e) {
        console.log(`${logPrefix} node request body -> (unserializable)`);
      }
    }

    const u = new URL(urlStr);
    const mod = u.protocol === 'https:' ? await import('node:https') : await import('node:http');
    const libReq = mod.request as typeof import('node:http').request;
    
    return new Promise((resolve, reject) => {
      const req = libReq(u, { method: init?.method ?? 'GET', headers: init?.headers ?? {} }, (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          const statusCode = res.statusCode ?? 0;
          
          // Log response body for errors and POST responses
          if (statusCode >= 400) {
            try {
              console.log(`${logPrefix} node response body (error) <-`, body.toString('utf8'));
            } catch (e) {
              console.log(`${logPrefix} node response body (error) <- (binary)`);
            }
          } else if (init?.method === 'POST') {
            try {
              console.log(`${logPrefix} node response body <-`, body.toString('utf8'));
            } catch (e) {
              console.log(`${logPrefix} node response body <- (binary)`);
            }
          }

          const response = {
            ok: statusCode >= 200 && statusCode < 300,
            status: statusCode,
            statusText: res.statusMessage ?? '',
            headers: res.headers,
            text: async () => body.toString('utf8'),
            json: async () => JSON.parse(body.toString('utf8')),
            arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
          };
          resolve(response as any);
        });
      });
      
      req.on('error', reject);
      
      if (init?.body) {
        if (typeof init.body === 'string' || init.body instanceof Buffer) {
          req.write(init.body);
        } else if (init.body instanceof Uint8Array) {
          req.write(Buffer.from(init.body));
        } else {
          req.write(JSON.stringify(init.body));
        }
      }
      
      req.end();
    });
  };

  return nodeFetchFallback;
};

/**
 * Wraps global fetch with logging and node fallback for tests
 * Returns a cleanup function to restore original fetch
 */
export const setupTestFetch = (logPrefix = '[fetch]') => {
  const setupFetch = (globalThis as any).fetch;
  const nodeFetchFallback = createNodeFetchFallback(logPrefix);

  const wrappedFetch = async (...args: any[]) => {
    const url = args[0];
    const opts = args[1] ?? {};
    console.log(`${logPrefix} request ->`, { url, method: opts.method ?? 'GET' });
    
    try {
      const res = await setupFetch(...args);
      console.log(`${logPrefix} response <-`, { url, status: res.status, statusText: res.statusText });
      return res;
    } catch (e: any) {
      // If test setup blocks the fetch, use node http fallback
      if (e?.message && typeof e.message === 'string' && e.message.includes('Unhandled fetch')) {
        console.log(`${logPrefix} setup fetch blocked; using node http fallback for`, url);
        const res = await nodeFetchFallback(...args);
        console.log(`${logPrefix} node response <-`, { url, status: (res as any).status, statusText: (res as any).statusText });
        return res;
      }
      console.log(`${logPrefix} fetch error ->`, e);
      throw e;
    }
  };

  (globalThis as any).fetch = wrappedFetch;

  // Return cleanup function
  return () => {
    (globalThis as any).fetch = setupFetch;
  };
};
