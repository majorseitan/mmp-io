import { describe, it, expect, beforeAll } from 'vitest';
import { wasmReady } from '../../../data/wasm';
import type { SummaryPass, SummmryPassAcumulator } from '../../../data/model';
import { summaryStatistics, summaryBytesWithIndex } from '../../../data/operators/summaryStatistics';

describe('summaryBytesWithIndex', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    it('should return string array from single partition with one variant', () => {
        // Create protobuf marshaled data using BufferSummaryPasses
        const buffer = new TextEncoder().encode('1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
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
        const partitions = [['1\t12345\tA\tT']];
        
        const summaryPass: SummaryPass = (window as any).BufferSummaryPasses(
            buffer, 
            JSON.stringify(metadata), 
            partitions
        );

        const result = summaryBytesWithIndex(summaryPass, '\t');
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);
        expect(typeof result[0]).toBe('string');
        // Should contain all 4 values (pvalue, beta, sebeta, af) joined by delimiter
        expect(result[0].split('\t').length).toBe(4);
    });

    it('should handle multiple partitions with same variant', () => {
        // Create two partitions with the same variant
        const buffer1 = new TextEncoder().encode('1\t100\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const buffer2 = new TextEncoder().encode('1\t100\tA\tT\t0.002\t0.6\t0.2\t0.4\n');
        
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
        const partitions = [['1\t100\tA\tT']];
        
        const pass1: SummaryPass = (window as any).BufferSummaryPasses(buffer1, JSON.stringify(metadata), partitions);
        const pass2: SummaryPass = (window as any).BufferSummaryPasses(buffer2, JSON.stringify(metadata), partitions);
        
        // Combine both passes
        const summaryPass: SummaryPass = [...pass1, ...pass2];

        const result = summaryBytesWithIndex(summaryPass, '\t');
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1); // One unique variant
        // Should contain 8 values (4 from each partition)
        expect(result[0].split('\t').length).toBe(8);
    });

    it('should handle multiple variants', () => {
        const buffer = new TextEncoder().encode(
            '1\t100\tA\tT\t0.001\t0.5\t0.1\t0.3\n' +
            '2\t200\tG\tC\t0.002\t0.6\t0.2\t0.4\n'
        );
        
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
        const partitions = [['1\t100\tA\tT', '2\t200\tG\tC']];
        
        const summaryPass: SummaryPass = (window as any).BufferSummaryPasses(
            buffer, 
            JSON.stringify(metadata), 
            partitions
        );

        const result = summaryBytesWithIndex(summaryPass, '\t');
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2); // Two variants
        expect(result[0].split('\t').length).toBe(4);
        expect(result[1].split('\t').length).toBe(4);
    });

    it('should handle comma delimiter', () => {
        const buffer = new TextEncoder().encode('1,12345,A,T,0.001,0.5,0.1,0.3\n');
        const metadata = {
            tag: 'csv',
            chromosomeColumn: 0,
            positionColumn: 1,
            referenceColumn: 2,
            alternativeColumn: 3,
            pValueColumn: 4,
            betaColumn: 5,
            sebetaColumn: 6,
            afColumn: 7,
            pval_threshold: 0.05,
            delimiter: ',',
        };
        const partitions = [['1,12345,A,T']];
        
        const summaryPass: SummaryPass = (window as any).BufferSummaryPasses(
            buffer, 
            JSON.stringify(metadata), 
            partitions
        );

        const result = summaryBytesWithIndex(summaryPass, ',');
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);
        expect(result[0].includes(',')).toBe(true);
        expect(result[0].split(',').length).toBe(4);
    });

    it('should handle empty summary pass', () => {
        // Create empty protobuf data
        const buffer = new TextEncoder().encode('');
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
        const partitions: string[][] = [];
        
        const summaryPass: SummaryPass = (window as any).BufferSummaryPasses(
            buffer, 
            JSON.stringify(metadata), 
            partitions
        );

        const result = summaryBytesWithIndex(summaryPass, '\t');
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
    });

    it('should return error for invalid protobuf data', () => {
        // Create invalid SummaryPass with non-protobuf data
        const invalidPass: SummaryPass = [new Uint8Array([1, 2, 3, 4, 5])];

        const result = summaryBytesWithIndex(invalidPass, '\t') as any;
        
        // Go WASM bridge returns error as {error: string}
        expect(result).toHaveProperty('error');
    });

    it('should preserve scientific notation for p-values', () => {
        const buffer = new TextEncoder().encode('1\t12345\tA\tT\t1.5e-08\t0.5\t0.1\t0.3\n');
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
        const partitions = [['1\t12345\tA\tT']];
        
        const summaryPass: SummaryPass = (window as any).BufferSummaryPasses(
            buffer, 
            JSON.stringify(metadata), 
            partitions
        );

        const result = summaryBytesWithIndex(summaryPass, '\t');
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);
        const values = result[0].split('\t');
        expect(values.length).toBe(4);
        // First value should be p-value in scientific notation
        expect(values[0]).toMatch(/e/i);
    });
});

describe('summaryStatistics', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    const mockCallback = {
        processing: () => {},
        success: () => {},
        error: () => {},
    };

    it('should process single file with single block', async () => {
        const buffer = new TextEncoder().encode('1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const metadata = {
            tag: 'file1',
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
        const partitions = [['1\t12345\tA\tT']];
        
        const file1Pass: SummaryPass = (window as any).BufferSummaryPasses(
            buffer, 
            JSON.stringify(metadata), 
            partitions
        );

        const accumulator: SummmryPassAcumulator = [file1Pass];

        const result = await summaryStatistics('\t', accumulator, mockCallback, false);
        
        expect(result).toHaveProperty('header');
        expect(result).toHaveProperty('data');
        expect(result.header).toBe('file1_pval\tfile1_beta\tfile1_sebeta\tfile1_af');
        expect(result.data.length).toBeGreaterThan(0);
    });

    it('should process multiple files with single block each', async () => {
        const buffer1 = new TextEncoder().encode('1\t100\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const buffer2 = new TextEncoder().encode('1\t100\tA\tT\t0.002\t0.6\t0.2\t0.4\n');
        
        const metadata = {
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
        const partitions = [['1\t100\tA\tT']];
        
        const file1Pass: SummaryPass = (window as any).BufferSummaryPasses(
            buffer1, 
            JSON.stringify({...metadata, tag: 'file1'}), 
            partitions
        );
        const file2Pass: SummaryPass = (window as any).BufferSummaryPasses(
            buffer2, 
            JSON.stringify({...metadata, tag: 'file2'}), 
            partitions
        );

        const accumulator: SummmryPassAcumulator = [file1Pass, file2Pass];

        const result = await summaryStatistics('\t', accumulator, mockCallback, false);
        
        expect(result).toHaveProperty('header');
        expect(result).toHaveProperty('data');
        expect(result.header).toBe('file1_pval\tfile1_beta\tfile1_sebeta\tfile1_af\tfile2_pval\tfile2_beta\tfile2_sebeta\tfile2_af');
        // Should have data from both files
        expect(result.data.length).toBeGreaterThan(0);
    });

    it('should handle multiple blocks across files', async () => {
        // File 1 has 2 blocks, File 2 has 2 blocks
        const buffer1Block1 = new TextEncoder().encode('1\t100\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const buffer1Block2 = new TextEncoder().encode('2\t200\tG\tC\t0.002\t0.6\t0.2\t0.4\n');
        const buffer2Block1 = new TextEncoder().encode('1\t100\tA\tT\t0.003\t0.7\t0.3\t0.5\n');
        const buffer2Block2 = new TextEncoder().encode('2\t200\tG\tC\t0.004\t0.8\t0.4\t0.6\n');
        
        const metadata = {
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
        
        const file1Pass: SummaryPass = [
            ...(window as any).BufferSummaryPasses(buffer1Block1, JSON.stringify({...metadata, tag: 'f1b1'}), [['1\t100\tA\tT']]),
            ...(window as any).BufferSummaryPasses(buffer1Block2, JSON.stringify({...metadata, tag: 'f1b2'}), [['2\t200\tG\tC']])
        ];
        const file2Pass: SummaryPass = [
            ...(window as any).BufferSummaryPasses(buffer2Block1, JSON.stringify({...metadata, tag: 'f2b1'}), [['1\t100\tA\tT']]),
            ...(window as any).BufferSummaryPasses(buffer2Block2, JSON.stringify({...metadata, tag: 'f2b2'}), [['2\t200\tG\tC']])
        ];

        const accumulator: SummmryPassAcumulator = [file1Pass, file2Pass];

        const result = await summaryStatistics('\t', accumulator, mockCallback, false);
        
        expect(result).toHaveProperty('header');
        expect(result).toHaveProperty('data');
        expect(result.header).toContain('f1b1_pval');
        expect(result.header).toContain('f2b1_af'); // Changed from f2b2 to f2b1 - only first block used
        // Should have data from both blocks
        expect(result.data.length).toBeGreaterThan(0);
    });

    it('should handle uneven block counts across files', async () => {
        // File 1 has 2 blocks, File 2 has 1 block
        const buffer1Block1 = new TextEncoder().encode('1\t100\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const buffer1Block2 = new TextEncoder().encode('2\t200\tG\tC\t0.002\t0.6\t0.2\t0.4\n');
        const buffer2Block1 = new TextEncoder().encode('1\t100\tA\tT\t0.003\t0.7\t0.3\t0.5\n');
        
        const metadata = {
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
        
        const file1Pass: SummaryPass = [
            ...(window as any).BufferSummaryPasses(buffer1Block1, JSON.stringify({...metadata, tag: 'f1b1'}), [['1\t100\tA\tT']]),
            ...(window as any).BufferSummaryPasses(buffer1Block2, JSON.stringify({...metadata, tag: 'f1b2'}), [['2\t200\tG\tC']])
        ];
        const file2Pass: SummaryPass = [
            ...(window as any).BufferSummaryPasses(buffer2Block1, JSON.stringify({...metadata, tag: 'f2b1'}), [['1\t100\tA\tT']])
        ];

        const accumulator: SummmryPassAcumulator = [file1Pass, file2Pass];

        const result = await summaryStatistics('\t', accumulator, mockCallback, false);
        
        expect(result).toHaveProperty('header');
        expect(result).toHaveProperty('data');
        expect(result.header).toContain('f1b1_pval');
        expect(result.header).toContain('f2b1_af');
        // Should have data from both blocks (uneven across files)
        expect(result.data.length).toBeGreaterThan(0);
    });

    it('should handle empty accumulator', async () => {
        const accumulator: SummmryPassAcumulator = [];

        const result = await summaryStatistics('\t', accumulator, mockCallback, false);
        
        expect(result).toHaveProperty('header');
        expect(result).toHaveProperty('data');
        expect(result.header).toBe('');
        expect(result.data).toBe('');
    });

    it('should handle comma delimiter', async () => {
        const buffer = new TextEncoder().encode('1,12345,A,T,0.001,0.5,0.1,0.3\n');
        const metadata = {
            tag: 'csv',
            chromosomeColumn: 0,
            positionColumn: 1,
            referenceColumn: 2,
            alternativeColumn: 3,
            pValueColumn: 4,
            betaColumn: 5,
            sebetaColumn: 6,
            afColumn: 7,
            pval_threshold: 0.05,
            delimiter: ',',
        };
        const partitions = [['1,12345,A,T']];
        
        const filePass: SummaryPass = (window as any).BufferSummaryPasses(
            buffer, 
            JSON.stringify(metadata), 
            partitions
        );

        const accumulator: SummmryPassAcumulator = [filePass];

        const result = await summaryStatistics(',', accumulator, mockCallback, false);
        expect(result).toHaveProperty('header');
        expect(result).toHaveProperty('data');
        expect(result.header).toBe('csv_pval,csv_beta,csv_sebeta,csv_af');
        expect(result.data.includes(',')).toBe(true);
    });

    it('should not duplicate headers when multiple blocks exist in a pass', async () => {
        // This tests the bug where headers were repeated for each block
        // File with 3 blocks (same tag for all blocks)
        const buffer1 = new TextEncoder().encode('1\t100\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const buffer2 = new TextEncoder().encode('2\t200\tG\tC\t0.002\t0.6\t0.2\t0.4\n');
        const buffer3 = new TextEncoder().encode('3\t300\tC\tG\t0.003\t0.7\t0.3\t0.5\n');
        
        const metadata = {
            tag: 'finngen',
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
        
        // Create 3 blocks for the same file (simulating FinnGen data with multiple blocks)
        const finngenPass: SummaryPass = [
            ...(window as any).BufferSummaryPasses(buffer1, JSON.stringify(metadata), [['1\t100\tA\tT']]),
            ...(window as any).BufferSummaryPasses(buffer2, JSON.stringify(metadata), [['2\t200\tG\tC']]),
            ...(window as any).BufferSummaryPasses(buffer3, JSON.stringify(metadata), [['3\t300\tC\tG']])
        ];

        const accumulator: SummmryPassAcumulator = [finngenPass];

        const result = await summaryStatistics('\t', accumulator, mockCallback, false);
        
        expect(result).toHaveProperty('header');
        expect(result).toHaveProperty('data');
        
        // Header should appear only ONCE, not repeated for each block
        const headerCols = result.header.split('\t');
        expect(headerCols).toEqual(['finngen_pval', 'finngen_beta', 'finngen_sebeta', 'finngen_af']);
        expect(headerCols.length).toBe(4);
        
        // Count occurrences of the tag in header
        const tagCount = result.header.split('finngen').length - 1;
        expect(tagCount).toBe(4); // Should appear once per column (4 columns), not 12 times (4 cols × 3 blocks)
    });

    it('should not duplicate headers across multiple passes with multiple blocks', async () => {
        // FinnGen pass with 3 blocks, Local file pass with 2 blocks
        const finngenBuffer1 = new TextEncoder().encode('1\t100\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const finngenBuffer2 = new TextEncoder().encode('2\t200\tG\tC\t0.002\t0.6\t0.2\t0.4\n');
        const finngenBuffer3 = new TextEncoder().encode('3\t300\tC\tG\t0.003\t0.7\t0.3\t0.5\n');
        
        const localBuffer1 = new TextEncoder().encode('4\t400\tT\tA\t0.004\t0.8\t0.4\t0.6\n');
        const localBuffer2 = new TextEncoder().encode('5\t500\tA\tG\t0.005\t0.9\t0.5\t0.7\n');
        
        const finngenMetadata = {
            tag: 'finngen',
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
        
        const localMetadata = {
            tag: 'local',
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
        
        const finngenPass: SummaryPass = [
            ...(window as any).BufferSummaryPasses(finngenBuffer1, JSON.stringify(finngenMetadata), [['1\t100\tA\tT']]),
            ...(window as any).BufferSummaryPasses(finngenBuffer2, JSON.stringify(finngenMetadata), [['2\t200\tG\tC']]),
            ...(window as any).BufferSummaryPasses(finngenBuffer3, JSON.stringify(finngenMetadata), [['3\t300\tC\tG']])
        ];
        
        const localPass: SummaryPass = [
            ...(window as any).BufferSummaryPasses(localBuffer1, JSON.stringify(localMetadata), [['4\t400\tT\tA']]),
            ...(window as any).BufferSummaryPasses(localBuffer2, JSON.stringify(localMetadata), [['5\t500\tA\tG']])
        ];

        const accumulator: SummmryPassAcumulator = [finngenPass, localPass];

        const result = await summaryStatistics('\t', accumulator, mockCallback, false);
        
        expect(result).toHaveProperty('header');
        expect(result).toHaveProperty('data');
        
        // Header should have columns from both files, but each file's columns should appear only ONCE
        const headerCols = result.header.split('\t');
        expect(headerCols).toEqual([
            'finngen_pval', 'finngen_beta', 'finngen_sebeta', 'finngen_af',
            'local_pval', 'local_beta', 'local_sebeta', 'local_af'
        ]);
        expect(headerCols.length).toBe(8); // 4 cols from finngen + 4 cols from local
        
        // Verify no duplication
        const finngenCount = result.header.split('finngen').length - 1;
        const localCount = result.header.split('local').length - 1;
        expect(finngenCount).toBe(4); // Should appear 4 times (once per column), not 12 (3 blocks × 4)
        expect(localCount).toBe(4); // Should appear 4 times (once per column), not 8 (2 blocks × 4)
    });
});

