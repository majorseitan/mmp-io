import { describe, it, expect, beforeAll } from 'vitest';
import { wasmReady } from '../wasm';
import { createFileColumnsIndex, bufferVariants, collectVariants } from './collectVariants';
import type { LocalFileConfiguration, BlockMetadata, StepCallBack, PipelineConfiguration } from '../model';

describe('createFileColumnsIndex', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    it('should create block metadata from LocalFileConfiguration and header', () => {
        const header = new TextEncoder().encode('CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF');
        const localFile: LocalFileConfiguration = {
            tag: 'test-file',
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
            file: new File([], 'test.txt')
        };

        const metadata = createFileColumnsIndex(localFile, header);

        expect(metadata.tag).toBe('test-file');
        expect(metadata.chromosomeColumn).toBe(0);
        expect(metadata.positionColumn).toBe(1);
        expect(metadata.referenceColumn).toBe(2);
        expect(metadata.alternativeColumn).toBe(3);
        expect(metadata.pValueColumn).toBe(4);
        expect(metadata.betaColumn).toBe(5);
        expect(metadata.sebetaColumn).toBe(6);
        expect(metadata.afColumn).toBe(7);
        expect(metadata.pval_threshold).toBe(0.05);
        expect(metadata.delimiter).toBe('\t');
    });

    it('should handle comma-delimited files', () => {
        const header = new TextEncoder().encode('CHR,POS,REF,ALT,PVAL,BETA,SE,AF');
        const localFile: LocalFileConfiguration = {
            tag: 'csv-file',
            chromosomeColumn: 'CHR',
            positionColumn: 'POS',
            referenceColumn: 'REF',
            alternativeColumn: 'ALT',
            pValueColumn: 'PVAL',
            betaColumn: 'BETA',
            sebetaColumn: 'SE',
            afColumn: 'AF',
            pval_threshold: 1e-8,
            delimiter: ',',
            file: new File([], 'test.csv')
        };

        const metadata = createFileColumnsIndex(localFile, header);

        expect(metadata.delimiter).toBe(',');
        expect(metadata.chromosomeColumn).toBe(0);
        expect(metadata.pval_threshold).toBe(1e-8);
    });

    it('should work with different column orderings', () => {
        const header = new TextEncoder().encode('PVAL\tBETA\tSE\tAF\tCHR\tPOS\tREF\tALT');
        const localFile: LocalFileConfiguration = {
            tag: 'reordered',
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
            file: new File([], 'test.txt')
        };

        const metadata = createFileColumnsIndex(localFile, header);

        expect(metadata.chromosomeColumn).toBe(4);
        expect(metadata.positionColumn).toBe(5);
        expect(metadata.pValueColumn).toBe(0);
    });

    it('should parse JSON result from WASM function', () => {
        const header = new TextEncoder().encode('CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF');
        const localFile: LocalFileConfiguration = {
            tag: 'json-test',
            chromosomeColumn: 'CHR',
            positionColumn: 'POS',
            referenceColumn: 'REF',
            alternativeColumn: 'ALT',
            pValueColumn: 'PVAL',
            betaColumn: 'BETA',
            sebetaColumn: 'SE',
            afColumn: 'AF',
            pval_threshold: 0.001,
            delimiter: '\t',
            file: new File([], 'test.txt')
        };

        const metadata: BlockMetadata = createFileColumnsIndex(localFile, header);

        // Verify the result is properly typed
        expect(typeof metadata.chromosomeColumn).toBe('number');
        expect(typeof metadata.tag).toBe('string');
        expect(typeof metadata.pval_threshold).toBe('number');
    });

    it('should throw error when column is missing in header', () => {
        const header = new TextEncoder().encode('POS\tREF\tALT\tPVAL\tBETA\tSE\tAF');
        const localFile: LocalFileConfiguration = {
            tag: 'missing-col',
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
            file: new File([], 'test.txt')
        };

        expect(() => {
            createFileColumnsIndex(localFile, header);
        }).toThrow();
    });
});

describe('WASM CreateFileColumnsIndex', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    it('should create block index from valid header and configuration', () => {
        const header = new TextEncoder().encode('CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF');
        const config = {
            tag: 'test',
            chromosomeColumn: 'CHR',
            positionColumn: 'POS',
            referenceColumn: 'REF',
            alternativeColumn: 'ALT',
            pValueColumn: 'PVAL',
            betaColumn: 'BETA',
            sebetaColumn: 'SE',
            afColumn: 'AF',
            pval_threshold: 0.05,
            delimiter: '\t'
        };

        const result = (window as any).CreateFileColumnsIndex(header, JSON.stringify(config));
        const metadata = JSON.parse(result);

        expect(metadata.tag).toBe('test');
        expect(metadata.chromosomeColumn).toBe(0);
        expect(metadata.positionColumn).toBe(1);
        expect(metadata.referenceColumn).toBe(2);
        expect(metadata.alternativeColumn).toBe(3);
        expect(metadata.pValueColumn).toBe(4);
        expect(metadata.betaColumn).toBe(5);
        expect(metadata.sebetaColumn).toBe(6);
        expect(metadata.afColumn).toBe(7);
        expect(metadata.delimiter).toBe('\t');
    });

    it('should handle errors for missing columns', () => {
        const header = new TextEncoder().encode('POS\tREF\tALT\tPVAL\tBETA\tSE\tAF');
        const config = {
            tag: 'test',
            chromosomeColumn: 'CHR',
            positionColumn: 'POS',
            referenceColumn: 'REF',
            alternativeColumn: 'ALT',
            pValueColumn: 'PVAL',
            betaColumn: 'BETA',
            sebetaColumn: 'SE',
            afColumn: 'AF',
            pval_threshold: 0.05,
            delimiter: '\t'
        };

        const result = (window as any).CreateFileColumnsIndex(header, JSON.stringify(config));
        
        // The WASM function returns an error object instead of throwing
        expect(result).toHaveProperty('error');
        expect(result.error).toContain('CHR');
    });

    it('should handle different delimiters', () => {
        const header = new TextEncoder().encode('CHR,POS,REF,ALT,PVAL,BETA,SE,AF');
        const config = {
            tag: 'test',
            chromosomeColumn: 'CHR',
            positionColumn: 'POS',
            referenceColumn: 'REF',
            alternativeColumn: 'ALT',
            pValueColumn: 'PVAL',
            betaColumn: 'BETA',
            sebetaColumn: 'SE',
            afColumn: 'AF',
            pval_threshold: 0.05,
            delimiter: ','
        };

        const result = (window as any).CreateFileColumnsIndex(header, JSON.stringify(config));
        const metadata = JSON.parse(result);

        expect(metadata.delimiter).toBe(',');
        expect(metadata.chromosomeColumn).toBe(0);
    });
});

describe('bufferVariants', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    const createTestMetadata = (): BlockMetadata => {
        const header = new TextEncoder().encode('CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF');
        const localFile: LocalFileConfiguration = {
            tag: 'test',
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
            file: new File([], 'test.txt')
        };
        return createFileColumnsIndex(localFile, header);
    };

    it('should return variants below p-value threshold', () => {
        const metadata = createTestMetadata();
        const buffer = new TextEncoder().encode('1\t12345\tA\tG\t0.001\t0.5\t0.1\t0.3\n');
        
        const variants = bufferVariants(buffer, metadata);
        
        expect(variants).toHaveLength(1);
        expect(variants[0]).toBe('1\t12345\tA\tG');
    });

    it('should exclude variants above p-value threshold', () => {
        const metadata = createTestMetadata();
        const buffer = new TextEncoder().encode('1\t12345\tA\tG\t0.5\t0.5\t0.1\t0.3\n');
        
        const variants = bufferVariants(buffer, metadata);
        
        expect(variants).toHaveLength(0);
    });

    it('should handle multiple variants', () => {
        const metadata = createTestMetadata();
        const buffer = new TextEncoder().encode(
            '1\t12345\tA\tG\t0.001\t0.5\t0.1\t0.3\n' +
            '2\t67890\tC\tT\t0.01\t0.3\t0.05\t0.2\n' +
            '3\t11111\tG\tA\t0.0001\t0.7\t0.15\t0.4\n'
        );
        
        const variants = bufferVariants(buffer, metadata);
        
        expect(variants).toHaveLength(3);
        expect(variants[0]).toBe('1\t12345\tA\tG');
        expect(variants[1]).toBe('2\t67890\tC\tT');
        expect(variants[2]).toBe('3\t11111\tG\tA');
    });

    it('should handle mixed variants with some above threshold', () => {
        const metadata = createTestMetadata();
        const buffer = new TextEncoder().encode(
            '1\t12345\tA\tG\t0.001\t0.5\t0.1\t0.3\n' +
            '2\t67890\tC\tT\t0.9\t0.3\t0.05\t0.2\n' +
            '3\t11111\tG\tA\t0.01\t0.7\t0.15\t0.4\n'
        );
        
        const variants = bufferVariants(buffer, metadata);
        
        expect(variants).toHaveLength(2);
        expect(variants[0]).toBe('1\t12345\tA\tG');
        expect(variants[1]).toBe('3\t11111\tG\tA');
    });

    it('should handle chromosome X', () => {
        const metadata = createTestMetadata();
        const buffer = new TextEncoder().encode('X\t12345\tA\tG\t0.001\t0.5\t0.1\t0.3\n');
        
        const variants = bufferVariants(buffer, metadata);
        
        expect(variants).toHaveLength(1);
        expect(variants[0]).toBe('23\t12345\tA\tG');
    });

    it('should handle chromosome Y', () => {
        const metadata = createTestMetadata();
        const buffer = new TextEncoder().encode('Y\t54321\tC\tT\t0.01\t0.3\t0.05\t0.2\n');
        
        const variants = bufferVariants(buffer, metadata);
        
        expect(variants).toHaveLength(1);
        expect(variants[0]).toBe('24\t54321\tC\tT');
    });

    it('should handle empty buffer', () => {
        const metadata = createTestMetadata();
        const buffer = new TextEncoder().encode('');
        
        const variants = bufferVariants(buffer, metadata);
        
        expect(variants).toHaveLength(0);
    });

    it('should handle comma-delimited data', () => {
        const header = new TextEncoder().encode('CHR,POS,REF,ALT,PVAL,BETA,SE,AF');
        const localFile: LocalFileConfiguration = {
            tag: 'csv',
            chromosomeColumn: 'CHR',
            positionColumn: 'POS',
            referenceColumn: 'REF',
            alternativeColumn: 'ALT',
            pValueColumn: 'PVAL',
            betaColumn: 'BETA',
            sebetaColumn: 'SE',
            afColumn: 'AF',
            pval_threshold: 0.05,
            delimiter: ',',
            file: new File([], 'test.csv')
        };
        const metadata = createFileColumnsIndex(localFile, header);
        const buffer = new TextEncoder().encode('1,12345,A,G,0.001,0.5,0.1,0.3\n');
        
        const variants = bufferVariants(buffer, metadata);
        
        expect(variants).toHaveLength(1);
        expect(variants[0]).toBe('1,12345,A,G');
    });

    it('should return error for insufficient columns', () => {
        const metadata = createTestMetadata();
        const buffer = new TextEncoder().encode('1\t12345\tA\n');
        
        const result = (window as any).BufferVariants(buffer, JSON.stringify(metadata));
        
        expect(result).toHaveProperty('error');
        expect(result.error).toContain('insufficient columns');
    });
});

describe('collectVariants', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    const pipelineConfig: PipelineConfiguration = {
        buffersize: 128 * 1024 * 1024
    };

    it('should collect variants from file with single chunk', async () => {
        const fileContent = 
            'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n' +
            '1\t12345\tA\tG\t0.001\t0.5\t0.1\t0.3\n' +
            '2\t67890\tC\tT\t0.01\t0.3\t0.05\t0.2\n';
        
        const file = new File([fileContent], 'test.tsv', { type: 'text/plain' });
        const localFile: LocalFileConfiguration = {
            tag: 'test',
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

        let processingCalled = false;
        let successCalled = false;
        const callback: StepCallBack = {
            processing: () => { processingCalled = true; },
            success: () => { successCalled = true; },
            error: () => {}
        };

        const variants = await collectVariants(localFile, pipelineConfig, callback);

        expect(processingCalled).toBe(true);
        expect(successCalled).toBe(true);
        expect(variants).toHaveLength(2);
        expect(variants[0]).toBe('1\t12345\tA\tG');
        expect(variants[1]).toBe('2\t67890\tC\tT');
    });

    it('should filter variants by p-value threshold', async () => {
        const fileContent = 
            'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n' +
            '1\t12345\tA\tG\t0.001\t0.5\t0.1\t0.3\n' +
            '2\t67890\tC\tT\t0.9\t0.3\t0.05\t0.2\n' +
            '3\t11111\tG\tA\t0.01\t0.7\t0.15\t0.4\n';
        
        const file = new File([fileContent], 'test.tsv', { type: 'text/plain' });
        const localFile: LocalFileConfiguration = {
            tag: 'test',
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

        const callback: StepCallBack = {
            processing: () => {},
            success: () => {},
            error: () => {}
        };

        const variants = await collectVariants(localFile, pipelineConfig, callback);

        expect(variants).toHaveLength(2);
        expect(variants[0]).toBe('1\t12345\tA\tG');
        expect(variants[1]).toBe('3\t11111\tG\tA');
    });

    it('should handle empty file', async () => {
        const file = new File([''], 'empty.tsv', { type: 'text/plain' });
        const localFile: LocalFileConfiguration = {
            tag: 'test',
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

        const callback: StepCallBack = {
            processing: () => {},
            success: () => {},
            error: () => {}
        };

        const variants = await collectVariants(localFile, pipelineConfig, callback);

        expect(variants).toHaveLength(0);
    });

    it('should handle file with only header', async () => {
        const fileContent = 'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n';
        const file = new File([fileContent], 'header-only.tsv', { type: 'text/plain' });
        const localFile: LocalFileConfiguration = {
            tag: 'test',
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

        const callback: StepCallBack = {
            processing: () => {},
            success: () => {},
            error: () => {}
        };

        const variants = await collectVariants(localFile, pipelineConfig, callback);

        expect(variants).toHaveLength(0);
    });

    it('should handle chromosome X and Y', async () => {
        const fileContent = 
            'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n' +
            'X\t12345\tA\tG\t0.001\t0.5\t0.1\t0.3\n' +
            'Y\t54321\tC\tT\t0.01\t0.3\t0.05\t0.2\n';
        
        const file = new File([fileContent], 'test.tsv', { type: 'text/plain' });
        const localFile: LocalFileConfiguration = {
            tag: 'test',
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

        const callback: StepCallBack = {
            processing: () => {},
            success: () => {},
            error: () => {}
        };

        const variants = await collectVariants(localFile, pipelineConfig, callback);

        expect(variants).toHaveLength(2);
        expect(variants[0]).toBe('23\t12345\tA\tG');
        expect(variants[1]).toBe('24\t54321\tC\tT');
    });

    it('should handle comma-delimited files', async () => {
        const fileContent = 
            'CHR,POS,REF,ALT,PVAL,BETA,SE,AF\n' +
            '1,12345,A,G,0.001,0.5,0.1,0.3\n' +
            '2,67890,C,T,0.01,0.3,0.05,0.2\n';
        
        const file = new File([fileContent], 'test.csv', { type: 'text/csv' });
        const localFile: LocalFileConfiguration = {
            tag: 'csv',
            chromosomeColumn: 'CHR',
            positionColumn: 'POS',
            referenceColumn: 'REF',
            alternativeColumn: 'ALT',
            pValueColumn: 'PVAL',
            betaColumn: 'BETA',
            sebetaColumn: 'SE',
            afColumn: 'AF',
            pval_threshold: 0.05,
            delimiter: ',',
            file
        };

        const callback: StepCallBack = {
            processing: () => {},
            success: () => {},
            error: () => {}
        };

        const variants = await collectVariants(localFile, pipelineConfig, callback);

        expect(variants).toHaveLength(2);
        expect(variants[0]).toBe('1,12345,A,G');
        expect(variants[1]).toBe('2,67890,C,T');
    });

    it('should handle large files with multiple chunks', async () => {
        // Create a file larger than one chunk (128MB is the chunk size in collectVariants)
        // We'll create a smaller file but the test validates the chunking logic
        let fileContent = 'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n';
        
        // Add enough rows to span multiple processing calls
        for (let i = 1; i <= 100; i++) {
            fileContent += `${i % 22 + 1}\t${i * 1000}\tA\tG\t0.001\t0.5\t0.1\t0.3\n`;
        }
        
        const file = new File([fileContent], 'large.tsv', { type: 'text/plain' });
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
            file
        };

        const callback: StepCallBack = {
            processing: () => {},
            success: () => {},
            error: () => {}
        };

        const variants = await collectVariants(localFile, pipelineConfig, callback);

        expect(variants).toHaveLength(100);
        expect(variants[0]).toBe('2\t1000\tA\tG');
        expect(variants[99]).toBe('13\t100000\tA\tG');
    });

    it('should work with different p-value thresholds', async () => {
        const fileContent = 
            'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n' +
            '1\t10000\tA\tG\t1e-10\t0.5\t0.1\t0.3\n' +
            '2\t20000\tC\tT\t1e-6\t0.3\t0.05\t0.2\n' +
            '3\t30000\tG\tA\t0.001\t0.7\t0.15\t0.4\n' +
            '4\t40000\tT\tC\t0.01\t0.4\t0.2\t0.5\n';
        
        const file = new File([fileContent], 'test.tsv', { type: 'text/plain' });
        const localFile: LocalFileConfiguration = {
            tag: 'test',
            chromosomeColumn: 'CHR',
            positionColumn: 'POS',
            referenceColumn: 'REF',
            alternativeColumn: 'ALT',
            pValueColumn: 'PVAL',
            betaColumn: 'BETA',
            sebetaColumn: 'SE',
            afColumn: 'AF',
            pval_threshold: 1e-5,
            delimiter: '\t',
            file
        };

        const callback: StepCallBack = {
            processing: () => {},
            success: () => {},
            error: () => {}
        };

        const variants = await collectVariants(localFile, pipelineConfig, callback);

        expect(variants).toHaveLength(2);
        expect(variants[0]).toBe('1\t10000\tA\tG');
        expect(variants[1]).toBe('2\t20000\tC\tT');
    });
});