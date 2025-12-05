import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { wasmReady, reloadWasm } from '../../../data/wasm';
import { smallPpipeline } from '../../../data/pipeline/small';
import type { LocalFileConfiguration, PipelineConfiguration, StepCallBack, FinngenFileArtifact } from '../../../data/model';
import { validFinngenRequest } from '../../finngenTestFixtures';
import { setupTestFetch } from '../../nodeFetchFallback';

describe('smallPpipeline (integration with real FinnGen API)', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    // Reload WASM before each test to ensure clean state
    beforeEach(async () => {
        await reloadWasm();
    });

    // Slow tests are skipped by default. Set `RUN_SLOW_TESTS=1` to enable.
    // @ts-ignore - process is available in test environment
    const runSlow = Boolean(process.env.RUN_SLOW_TESTS);
    const testFn = runSlow ? it : it.skip;

    testFn(
        'processes local file with FinnGen data end-to-end',
        async () => {
            // Create a local file with some test variants
            // Using variants that should overlap with FinnGen data
            const fileContent =
                'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n' +
                '1\t10001\tA\tG\t0.001\t0.5\t0.1\t0.3\n' +
                '1\t10002\tC\tT\t0.002\t0.4\t0.12\t0.25\n' +
                '1\t10003\tG\tA\t0.003\t0.3\t0.15\t0.2\n' +
                '2\t20001\tT\tC\t0.004\t0.2\t0.18\t0.15\n' +
                '2\t20002\tA\tG\t0.005\t0.1\t0.2\t0.1\n';

            const file = new File([fileContent], 'test-with-finngen.tsv', { type: 'text/plain' });

            const localFile: LocalFileConfiguration = {
                tag: 'local_file',
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

            // Use FinnGen test fixture
            const finngenInputs: FinngenFileArtifact[] = validFinngenRequest.inputs;

            const pipelineConfig: PipelineConfiguration = {
                buffersize: 128 * 1024,
                blocksize: 10
            };

            let processedCalled = false;
            let successCalled = false;
            let errorCalled = false;

            const callback: StepCallBack = {
                processing: () => { processedCalled = true; },
                success: () => { successCalled = true; },
                error: () => { errorCalled = true; }
            };

            // Setup fetch for the test
            const restoreFetch = setupTestFetch('[smallPpipeline-test]');

            try {
                const result = await smallPpipeline(localFile, finngenInputs, pipelineConfig, callback);

                // Restore fetch
                restoreFetch();

                // Verify callback behavior - with test variants that don't exist in FinnGen,
                // the API will return an error, which is expected
                expect(processedCalled).toBe(true);
                
                // Verify result structure
                expect(result).toHaveProperty('header');
                expect(result).toHaveProperty('data');
                expect(typeof result.header).toBe('string');
                expect(typeof result.data).toBe('string');

                // Note: With non-existent test variants, FinnGen API returns error,
                // so we expect empty results but valid structure
                if (errorCalled) {
                    expect(result.header).toBe('');
                    expect(result.data).toBe('');
                } else {
                    // If by chance the variants exist, verify structure
                    expect(result.header.length).toBeGreaterThan(0);
                    expect(result.data.length).toBeGreaterThan(0);
                }
            } catch (error) {
                restoreFetch();
                throw error;
            }
        },
        180000 // 3 minute timeout for slow network test
    );

    testFn(
        'handles empty local file with FinnGen data',
        async () => {
            // Create a local file with only headers
            const fileContent = 'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n';

            const file = new File([fileContent], 'empty-test.tsv', { type: 'text/plain' });

            const localFile: LocalFileConfiguration = {
                tag: 'empty_file',
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

            const finngenInputs: FinngenFileArtifact[] = validFinngenRequest.inputs;

            const pipelineConfig: PipelineConfiguration = {
                buffersize: 128 * 1024,
                blocksize: 10
            };

            const callback: StepCallBack = {
                processing: () => {},
                success: () => {},
                error: () => {}
            };

            const restoreFetch = setupTestFetch('[empty-local-file]');

            try {
                const result = await smallPpipeline(localFile, finngenInputs, pipelineConfig, callback);
                restoreFetch();

                // Should still return valid structure with FinnGen data
                expect(result).toHaveProperty('header');
                expect(result).toHaveProperty('data');
                expect(typeof result.header).toBe('string');
                expect(result.header.length).toBeGreaterThan(0);
            } catch (error) {
                restoreFetch();
                throw error;
            }
        },
        180000
    );

    testFn(
        'handles FinnGen API error gracefully',
        async () => {
            const fileContent =
                'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n' +
                '1\t10001\tA\tG\t0.001\t0.5\t0.1\t0.3\n';

            const file = new File([fileContent], 'test-error.tsv', { type: 'text/plain' });

            const localFile: LocalFileConfiguration = {
                tag: 'error_test',
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

            // Use invalid FinnGen inputs to trigger an error
            const invalidInputs: FinngenFileArtifact[] = [
                {
                    collection: 'invalid_collection',
                    phenocode: 'DOES_NOT_EXIST_999999',
                    phenostring: 'Invalid phenotype',
                    tag: 'invalid_test',
                    chromosomeColumn: '#chrom',
                    positionColumn: 'pos',
                    referenceColumn: 'ref',
                    alternativeColumn: 'alt',
                    pValueColumn: 'pval',
                    betaColumn: 'beta',
                    sebetaColumn: 'sebeta',
                    afColumn: 'af_alt',
                    pval_threshold: 0.00001,
                }
            ];

            const pipelineConfig: PipelineConfiguration = {
                buffersize: 128 * 1024,
                blocksize: 10
            };

            let errorCalled = false;

            const callback: StepCallBack = {
                processing: () => {},
                success: () => {},
                error: () => { errorCalled = true; }
            };

            const restoreFetch = setupTestFetch('[invalid-finngen]');

            try {
                const result = await smallPpipeline(localFile, invalidInputs, pipelineConfig, callback);
                restoreFetch();

                // Should call error callback
                expect(errorCalled).toBe(true);

                // Should return empty result
                expect(result.header).toBe('');
                expect(result.data).toBe('');
            } catch (error) {
                restoreFetch();
                throw error;
            }
        },
        60000 // 1 minute timeout
    );

    testFn(
        'correctly partitions variants between FinnGen and local data',
        async () => {
            // Create a local file with variants - some will overlap with FinnGen, some won't
            const fileContent =
                'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n' +
                '1\t100001\tA\tG\t0.001\t0.5\t0.1\t0.3\n' +
                '1\t100002\tC\tT\t0.002\t0.4\t0.12\t0.25\n' +
                '1\t100003\tG\tA\t0.003\t0.3\t0.15\t0.2\n' +
                '1\t100004\tT\tC\t0.004\t0.2\t0.18\t0.15\n' +
                '1\t100005\tA\tG\t0.005\t0.1\t0.2\t0.1\n' +
                '1\t100006\tC\tT\t0.006\t0.15\t0.22\t0.12\n' +
                '1\t100007\tG\tA\t0.007\t0.25\t0.25\t0.18\n' +
                '1\t100008\tT\tC\t0.008\t0.35\t0.28\t0.22\n';

            const file = new File([fileContent], 'test-partitions.tsv', { type: 'text/plain' });

            const localFile: LocalFileConfiguration = {
                tag: 'partition_test',
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

            const finngenInputs: FinngenFileArtifact[] = validFinngenRequest.inputs;

            const pipelineConfig: PipelineConfiguration = {
                buffersize: 128 * 1024,
                blocksize: 3 // Small block size to test partitioning
            };

            const callback: StepCallBack = {
                processing: () => {},
                success: () => {},
                error: () => {}
            };

            const restoreFetch = setupTestFetch('[partition-test]');

            try {
                const result = await smallPpipeline(localFile, finngenInputs, pipelineConfig, callback);
                restoreFetch();

                // Verify we got results
                expect(result.header.length).toBeGreaterThan(0);
                expect(result.data.length).toBeGreaterThan(0);

                // Should have both local and FinnGen columns
                expect(result.header).toContain('partition_test_pval');
                expect(result.header).toContain('labvalues_21491979_pval');

                // Verify data rows
                const dataRows = result.data.trim().split('\n');
                expect(dataRows.length).toBeGreaterThan(0);
            } catch (error) {
                restoreFetch();
                throw error;
            }
        },
        180000
    );
});
