import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load WASM in Node.js
const loadWasm = async () => {
    // Load wasm_exec.js
    const wasmExecPath = join(__dirname, '../../../public/wasm/wasm_exec.js');
    const wasmExecCode = readFileSync(wasmExecPath, 'utf-8');
    
    // Create global object for Go WASM
    (global as any).Go = eval(wasmExecCode + '; Go');
    
    const go = new (global as any).Go();
    
    // Load WASM file
    const wasmPath = join(__dirname, '../../../public/wasm/main.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    const instance = await WebAssembly.instantiate(wasmModule, go.importObject);
    
    go.run(instance);
    console.log('WASM loaded successfully');
};

// Main execution
(async () => {
    await loadWasm();
    
    // Example: Create test buffer and metadata
    const buffer = new TextEncoder().encode('1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n2\t67890\tG\tC\t0.002\t0.6\t0.2\t0.4\n');
    const metadata = {
        tag: 'test',
        chromosomeColumn: 0,
        positionColumn: 1,
        referenceColumn: 2,
        alternativeColumn: 3,
        pValueColumn: 4,
        betaColumn: 5,
        sebetaColumn: 6,
        afColumn: 7,
        pval_threshold: 0.05,
        delimiter: '\t',
    };
    const partitions = [
        ['1\t12345\tA\tT'],
        ['2\t67890\tG\tC']
    ];

    // Call bufferSummaryPass via WASM
    const result = (global as any).BufferSummaryPasses(buffer, JSON.stringify(metadata), partitions);

    // Write each element to /tmp/bufferSummaryPass.${n}.out.pb
    result.forEach((block: Uint8Array, index: number) => {
        const filename = `/tmp/bufferSummaryPass.${index}.out.pb`;
        writeFileSync(filename, block);
        console.log(`Wrote block ${index} (${block.length} bytes) to ${filename}`);
    });

    console.log(`Total blocks written: ${result.length}`);
})().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
