import { readFileSync } from 'fs';
import { join } from 'path';

// Make fetch available for loading WASM files
(global as any).fetch = async (url: string | URL | Request): Promise<Response> => {
  const urlStr = typeof url === 'string' ? url : url.toString();
  
  if (urlStr.includes('wasm_exec.js')) {
    const content = readFileSync(join(process.cwd(), 'public/wasm/wasm_exec.js'), 'utf-8');
    return {
      text: async () => content,
      ok: true,
      status: 200,
    } as Response;
  }
  
  if (urlStr.includes('main.wasm')) {
    const content = readFileSync(join(process.cwd(), 'public/wasm/main.wasm'));
    return {
      arrayBuffer: async () => content.buffer,
      ok: true,
      status: 200,
    } as Response;
  }
  
  throw new Error(`Unhandled fetch: ${urlStr}`);
};

// Replace WebAssembly.instantiateStreaming with instantiate for Node environment
(global as any).WebAssembly.instantiateStreaming = async (responsePromise: Response | Promise<Response>, importObject?: WebAssembly.Imports) => {
  const response = await responsePromise;
  const buffer = await response.arrayBuffer();
  return WebAssembly.instantiate(buffer, importObject);
};
