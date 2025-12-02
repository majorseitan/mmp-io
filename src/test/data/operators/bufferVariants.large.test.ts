import { describe, it, expect, beforeAll } from 'vitest';
import { wasmReady } from '../wasm';
import { createFileColumnsIndex } from './collectVariants';
import type { LocalFileConfiguration, PipelineConfiguration, StepCallBack } from '../model';

// This test is intentionally large and will only run when the env var
// RUN_LARGE_TESTS is set to '1'. Run with:
// RUN_LARGE_TESTS=1 npx vitest src/data/operators/bufferVariants.large.test.ts

const runLarge = (globalThis as any).process?.env?.RUN_LARGE_TESTS === '1';

(runLarge ? describe : describe.skip)('BufferVariants large buffer', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    (runLarge ? it : it.skip)('processes large buffer and times the run', async () => {
        // Target size in MB can be configured with env var `BUFFER_VARIANTS_TEST_MB`.
        // Default to 100MB for safer runs.
        const sizeMB = parseInt(((globalThis as any).process?.env?.BUFFER_VARIANTS_TEST_MB) || '100', 10);
        const TARGET_SIZE = sizeMB * 1_000_000;
        const encoder = new TextEncoder();

        const headerStr = 'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n';

        // Helper to produce realistic variant rows
        const nucleotides = ['A', 'C', 'G', 'T'];
        const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
        const randChoice = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
        const randChrom = () => {
            const v = randInt(1, 24);
            if (v <= 22) return String(v);
            return v === 23 ? 'X' : 'Y';
        };
        const randPValue = () => {
            // log-uniform between 1e-12 and 1
            const exp = Math.random() * 12; // 0..12
            return Math.pow(10, -exp);
        };
        const randBeta = () => (Math.random() * 2 - 1).toFixed(3); // -1..1
        const randSE = () => (Math.random() * 0.5).toFixed(3);
        const randAF = () => (Math.random()).toFixed(3);

        // Prepare metadata using header so indices match expected layout
        const localFile: LocalFileConfiguration = {
            tag: 'large',
            chromosomeColumn: 'CHR',
            positionColumn: 'POS',
            referenceColumn: 'REF',
            alternativeColumn: 'ALT',
            pValueColumn: 'PVAL',
            betaColumn: 'BETA',
            sebetaColumn: 'SE',
            afColumn: 'AF',
            pval_threshold: 0.05,
            delimiter: '\t',
            file: new File([], 'large.tsv')
        };

        const metadata = createFileColumnsIndex(localFile, encoder.encode(headerStr));

        // Build up text in an array and join at the end to avoid partial-write artifacts
        const parts: string[] = [];
        let totalLen = 0;
        while (totalLen < TARGET_SIZE) {
            const chrom = randChrom();
            const pos = randInt(1, 1_000_000_000);
            const ref = randChoice(nucleotides);
            const alt = randChoice(nucleotides.filter(n => n !== ref));
            const pval = randPValue().toExponential(3);
            const beta = randBeta();
            const se = randSE();
            const af = randAF();

            const lineStr = `${chrom}\t${pos}\t${ref}\t${alt}\t${pval}\t${beta}\t${se}\t${af}\n`;
            if (totalLen + lineStr.length > TARGET_SIZE) break;
            parts.push(lineStr);
            totalLen += lineStr.length;
        }

        const bigText = parts.join('');
        const buffer = encoder.encode(bigText);
        const offset = buffer.length;

        // Time the WASM call
        const start = Date.now();
        // BufferVariants WASM binding expects (Uint8Array, JSON(metadata))
        const result = (window as any).BufferVariants(buffer, JSON.stringify(metadata));
        const end = Date.now();

        const durationMs = end - start;
        // Log timing so test output shows it
        // eslint-disable-next-line no-console
        console.log(`BufferVariants processed ~${(offset / 1_000_000).toFixed(1)}MB in ${durationMs}ms`);

        // Basic assertions
        expect(result).toBeDefined();
        // Expect an array (or an error object from WASM); if it's an object with error, fail
        if (Array.isArray(result)) {
            expect(result.length).toBeGreaterThan(0);
        } else {
            // If WASM returned error object, fail the test with the message
            expect(result).not.toHaveProperty('error');
        }
    }, 60 * 60 * 1000); // extend timeout: 1 hour in case this runs slowly
});
