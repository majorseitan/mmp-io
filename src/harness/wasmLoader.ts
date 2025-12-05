import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Loads the WASM module in Node.js environment
 * Sets up the Go WASM runtime and instantiates the module
 */
export const loadWasm = async (): Promise<void> => {
    // Set up window for Go WASM (it expects window object)
    (globalThis as any).window = globalThis;
    
    const wasmExecPath = join(__dirname, '../../public/wasm/wasm_exec.js');
    const wasmExecCode = readFileSync(wasmExecPath, 'utf-8');
    
    (globalThis as any).Go = eval(wasmExecCode + '; Go');
    
    const go = new (globalThis as any).Go();
    
    const wasmPath = join(__dirname, '../../public/wasm/main.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    const instance = await WebAssembly.instantiate(wasmModule, go.importObject);
    
    go.run(instance);
    console.log('WASM loaded successfully');
};
