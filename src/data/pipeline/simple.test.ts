import { describe, it, expect, beforeAll } from 'vitest';
import { wasmReady } from '../wasm';
import { simplePpipeline } from './simple';
import type { LocalFileConfiguration, PipelineConfiguration, StepCallBack } from '../model';

describe('simplePpipeline', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    it('processes a single small file end-to-end', async () => {
        const fileContent =
            'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n' +
            '1\t12345\tA\tG\t0.001\t0.5\t0.1\t0.3\n';

        const file = new File([fileContent], 'test.tsv', { type: 'text/plain' });

        const localFile: LocalFileConfiguration = {
            tag: 'file1',
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
            file
        };

        const pipelineConfig: PipelineConfiguration = {
            buffersize: 128 * 1024
        };

        const callback: StepCallBack = {
            processing: () => {},
            success: () => {},
            error: () => {}
        };

        const result = await simplePpipeline(localFile, pipelineConfig, callback);

        expect(result).toHaveProperty('header');
        expect(result).toHaveProperty('data');
        // Header is produced by FileHeader and may be file-specific; ensure it's present
        expect(typeof result.header).toBe('string');
        expect(result.header).toBe("file1_pval\tfile1_beta\tfile1_sebeta\tfile1_af");
        expect(result.header.length).toBeGreaterThan(0);
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data).toBe('1.000000e-03\t0.500000\t0.100000\t0.300000');
    });
});
