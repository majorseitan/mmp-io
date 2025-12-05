declare var Go: any;
let wasmReadyPromise: Promise<void> | null = null;

const initWasm = async () => {
    if (wasmReadyPromise) return wasmReadyPromise;
    
    wasmReadyPromise = (async () => {
        try {
            const response = await fetch('/wasm/wasm_exec.js');
            const wasmExecCode = await response.text();
            eval(wasmExecCode);
            
            const go = new Go();
            const result = await WebAssembly.instantiateStreaming(fetch('/wasm/main.wasm'), go.importObject);
            go.run(result.instance);
            console.log('WASM loaded');
        } catch (error) {
            console.error('Failed to load WASM:', error);
            throw error;
        }
    })();
    
    return wasmReadyPromise;
};


export interface WasmEnvInfo {
  hasSharedArrayBuffer: boolean;
  hasProperIsolation: boolean; // implies COOP/COEP set correctly
  hasWasmThreads: boolean;
}

/**
 * Detects whether the environment supports:
 * - SharedArrayBuffer
 * - Correct COOP/COEP isolation (crossOriginIsolated)
 * - WebAssembly threads (via Shared WebAssembly.Memory)
 */
export function detectWasmEnv(): WasmEnvInfo {
  const hasSharedArrayBuffer = typeof SharedArrayBuffer === "function";

  // COOP/COEP cannot be read directly, but browsers expose:
  //   window.crossOriginIsolated === true
  // when headers are set properly.
  const hasProperIsolation = hasSharedArrayBuffer && (window as any).crossOriginIsolated === true;

  let hasWasmThreads = false;

  try {
    // WebAssembly threads require:
    //  - SharedArrayBuffer
    //  - Atomics
    //  - WebAssembly.Memory({shared: true})
    if (hasProperIsolation && typeof Atomics === "object") {
      const mem = new WebAssembly.Memory({
        initial: 1,
        maximum: 10,
        shared: true
      });

      // If this succeeded, threads are available
      hasWasmThreads = mem instanceof WebAssembly.Memory;
    }
  } catch (err) {
    hasWasmThreads = false;
  }

  return {
    hasSharedArrayBuffer,
    hasProperIsolation,
    hasWasmThreads
  };
}

const env = detectWasmEnv();

console.log("SharedArrayBuffer:", env.hasSharedArrayBuffer);
console.log("COOP/COEP OK:", env.hasProperIsolation);
console.log("WASM Threads:", env.hasWasmThreads);

if (!env.hasProperIsolation) {
  console.warn("⚠️ COOP/COEP headers missing. WASM threads will NOT work.");
}

export const wasmReady = initWasm();

/**
 * Force reload WASM by clearing the cached promise and reinitializing
 * Useful for tests that need a clean WASM state
 */
export const reloadWasm = async () => {
    wasmReadyPromise = null;
    return initWasm();
};