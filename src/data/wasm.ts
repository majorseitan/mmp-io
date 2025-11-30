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

export const wasmReady = initWasm();