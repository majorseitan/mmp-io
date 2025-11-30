import { describe, it, expect, beforeAll } from 'vitest';
import { wasmReady } from '../../data/wasm';
import { createFileColumnsIndex } from './collectVariants';
import type { LocalFileConfiguration, BlockMetadata } from '../model';

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