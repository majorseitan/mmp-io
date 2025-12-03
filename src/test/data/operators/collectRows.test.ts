import { describe, it, expect, beforeAll } from 'vitest';
import { wasmReady } from '../../../data/wasm';
import type { BlockMetadata, VariantPartitions, SummaryPass } from '../../../data/model';

// Import the function through the module to test
const bufferSummaryPass = (buffer: Uint8Array, metadata: BlockMetadata, partitions: VariantPartitions): SummaryPass => {
    const result: SummaryPass = (window as any).BufferSummaryPasses(buffer, JSON.stringify(metadata), partitions);
    return result;
};

describe('bufferSummaryPass', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    it('should return SummaryPass type (array of Uint8Array arrays)', () => {
        const buffer = new TextEncoder().encode('1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const metadata: BlockMetadata = {
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
        const partitions: VariantPartitions = [
            ['1\t12345\tA\tT']
        ];

        const result = bufferSummaryPass(buffer, metadata, partitions);
        
        // Check type structure: SummaryPass = SummaryBlock[] where SummaryBlock = Uint8Array[]
        // Note: In this case, each partition returns a single Uint8Array (protobuf marshaled SummaryRows)
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1); // One partition
        expect(result[0]).toBeInstanceOf(Uint8Array); // Protobuf marshaled data
    });

    it('should handle single partition with one variant', () => {
        const buffer = new TextEncoder().encode('1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const metadata: BlockMetadata = {
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
        const partitions: VariantPartitions = [
            ['1\t12345\tA\tT']
        ];

        const result = bufferSummaryPass(buffer, metadata, partitions);

        expect(result.length).toBe(1);
        expect(result[0]).toBeInstanceOf(Uint8Array);
    });

    it('should handle multiple partitions', () => {
        const buffer = new TextEncoder().encode(
            '1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n' +
            '2\t67890\tG\tC\t0.01\t0.2\t0.05\t0.4\n' +
            '3\t11111\tC\tG\t0.005\t0.3\t0.08\t0.5\n'
        );
        const metadata: BlockMetadata = {
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
        const partitions: VariantPartitions = [
            ['1\t12345\tA\tT'],
            ['2\t67890\tG\tC', '3\t11111\tC\tG']
        ];

        const result = bufferSummaryPass(buffer, metadata, partitions);

        expect(result.length).toBe(2); // Two partitions
        expect(result[0]).toBeInstanceOf(Uint8Array); // First partition has protobuf data
        expect(result[1]).toBeInstanceOf(Uint8Array); // Second partition has protobuf data
    });

    it('should handle empty partitions', () => {
        const buffer = new TextEncoder().encode('1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const metadata: BlockMetadata = {
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
        const partitions: VariantPartitions = [];

        const result = bufferSummaryPass(buffer, metadata, partitions);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
    });

    it('should handle missing variants (partial data)', () => {
        const buffer = new TextEncoder().encode('1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const metadata: BlockMetadata = {
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
        const partitions: VariantPartitions = [
            ['1\t12345\tA\tT', '2\t67890\tG\tC'] // Second variant not in buffer
        ];

        const result = bufferSummaryPass(buffer, metadata, partitions);

        // Should not throw error, just return data for found variants
        expect(result.length).toBe(1);
        expect(result[0]).toBeInstanceOf(Uint8Array);
    });

    it('should handle comma-delimited data', () => {
        const buffer = new TextEncoder().encode('1,12345,A,T,0.001,0.5,0.1,0.3\n');
        const metadata: BlockMetadata = {
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
        const partitions: VariantPartitions = [
            ['1,12345,A,T']
        ];

        const result = bufferSummaryPass(buffer, metadata, partitions);

        expect(result.length).toBe(1);
        expect(result[0]).toBeInstanceOf(Uint8Array);
    });

    it('should handle chromosome X conversion', () => {
        const buffer = new TextEncoder().encode('X\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const metadata: BlockMetadata = {
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
        const partitions: VariantPartitions = [
            ['23\t12345\tA\tT'] // X is converted to 23
        ];

        const result = bufferSummaryPass(buffer, metadata, partitions);

        expect(result.length).toBe(1);
        expect(result[0]).toBeInstanceOf(Uint8Array);
    });

    it('should return error for insufficient columns', () => {
        const buffer = new TextEncoder().encode('1\t12345\tA\n');
        const metadata: BlockMetadata = {
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
        const partitions: VariantPartitions = [
            ['1\t12345\tA\tT']
        ];

        const result = bufferSummaryPass(buffer, metadata, partitions) as any;
        expect(result).toHaveProperty('error');
        expect(result.error).toContain('insufficient columns');
    });

    it('should return error for invalid chromosome', () => {
        const buffer = new TextEncoder().encode('INVALID\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n');
        const metadata: BlockMetadata = {
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
        const partitions: VariantPartitions = [
            ['INVALID\t12345\tA\tT']
        ];

        const result = bufferSummaryPass(buffer, metadata, partitions) as any;
        expect(result).toHaveProperty('error');
        expect(result.error).toContain('chromosome');
    });

    it('should return error for invalid pvalue', () => {
        const buffer = new TextEncoder().encode('1\t12345\tA\tT\tINVALID\t0.5\t0.1\t0.3\n');
        const metadata: BlockMetadata = {
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
        const partitions: VariantPartitions = [
            ['1\t12345\tA\tT']
        ];

        const result = bufferSummaryPass(buffer, metadata, partitions) as any;
        expect(result).toHaveProperty('error');
        expect(result.error).toMatch(/parse|invalid|pvalue/i);
    });

    it('should verify SummaryPass structure matches expected type', () => {
        const buffer = new TextEncoder().encode(
            '1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n' +
            '2\t67890\tG\tC\t0.01\t0.2\t0.05\t0.4\n'
        );
        const metadata: BlockMetadata = {
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
        const partitions: VariantPartitions = [
            ['1\t12345\tA\tT'],
            ['2\t67890\tG\tC']
        ];

        const result: SummaryPass = bufferSummaryPass(buffer, metadata, partitions);

        // Type assertions to verify structure
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2); // Two partitions
        
        // Each element should be a SummaryBlock (Uint8Array containing protobuf marshaled data)
        result.forEach((block) => {
            expect(block).toBeInstanceOf(Uint8Array);
            expect(block.length).toBeGreaterThan(0); // Should have data
        });
    });
});
