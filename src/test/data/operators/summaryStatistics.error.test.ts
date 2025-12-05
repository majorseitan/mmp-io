import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { summaryBytesWithIndex } from '../../../data/operators/summaryStatistics';
import { wasmReady } from '../../../data/wasm';
import type { SummaryPass } from '../../../data/model';

describe('summaryStatistics error handling', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    afterEach(() => {
        // Clean up any mocked window functions
        if ((window as any).__originalSummaryBytesString) {
            (window as any).SummaryBytesString = (window as any).__originalSummaryBytesString;
            delete (window as any).__originalSummaryBytesString;
        }
        if ((window as any).__originalHeaderBytesString) {
            (window as any).HeaderBytesString = (window as any).__originalHeaderBytesString;
            delete (window as any).__originalHeaderBytesString;
        }
        if ((window as any).__originalCreateEmptyBlock) {
            (window as any).CreateEmptyBlock = (window as any).__originalCreateEmptyBlock;
            delete (window as any).__originalCreateEmptyBlock;
        }
    });

    describe('summaryBytesWithIndex', () => {
        it('should handle WASM error object', () => {
            // Mock the WASM function to return an error
            (window as any).__originalSummaryBytesString = (window as any).SummaryBytesString;
            (window as any).SummaryBytesString = () => ({ error: 'Test error from WASM' });

            const summaryPass: SummaryPass = [new Uint8Array([1, 2, 3])];
            
            expect(() => {
                summaryBytesWithIndex(summaryPass, '\t', false);
            }).toThrow('SummaryBytesString error: Test error from WASM');
        });

        it('should return empty array when WASM returns undefined', () => {
            // Mock the WASM function to return undefined
            (window as any).__originalSummaryBytesString = (window as any).SummaryBytesString;
            (window as any).SummaryBytesString = () => undefined;

            const summaryPass: SummaryPass = [new Uint8Array([1, 2, 3])];
            
            const result = summaryBytesWithIndex(summaryPass, '\t', false);
            expect(result).toEqual([]);
        });

        it('should return empty array when WASM returns null', () => {
            // Mock the WASM function to return null
            (window as any).__originalSummaryBytesString = (window as any).SummaryBytesString;
            (window as any).SummaryBytesString = () => null;

            const summaryPass: SummaryPass = [new Uint8Array([1, 2, 3])];
            
            const result = summaryBytesWithIndex(summaryPass, '\t', false);
            expect(result).toEqual([]);
        });

        it('should throw error when WASM returns non-array', () => {
            // Mock the WASM function to return a string instead of array
            (window as any).__originalSummaryBytesString = (window as any).SummaryBytesString;
            (window as any).SummaryBytesString = () => 'not an array';

            const summaryPass: SummaryPass = [new Uint8Array([1, 2, 3])];
            
            expect(() => {
                summaryBytesWithIndex(summaryPass, '\t', false);
            }).toThrow('SummaryBytesString returned non-array: string');
        });

        it('should return array when WASM succeeds', () => {
            // Mock the WASM function to return a valid array
            (window as any).__originalSummaryBytesString = (window as any).SummaryBytesString;
            (window as any).SummaryBytesString = () => ['row1', 'row2', 'row3'];

            const summaryPass: SummaryPass = [new Uint8Array([1, 2, 3])];
            
            const result = summaryBytesWithIndex(summaryPass, '\t', false);
            expect(result).toEqual(['row1', 'row2', 'row3']);
        });

        it('should return empty array for empty input', () => {
            // Mock the WASM function to return empty array
            (window as any).__originalSummaryBytesString = (window as any).SummaryBytesString;
            (window as any).SummaryBytesString = () => [];

            const summaryPass: SummaryPass = [];
            
            const result = summaryBytesWithIndex(summaryPass, '\t', false);
            expect(result).toEqual([]);
        });
    });

    describe('headerBytesString (via summaryStatistics)', () => {
        // Note: headerBytesString is not exported, so we test it indirectly
        // through summaryStatistics or create a test helper

        it('should handle error from HeaderBytesString WASM function', async () => {
            const { summaryStatistics } = await import('../../../data/operators/summaryStatistics');
            
            // Mock both WASM functions - need to mock SummaryBytesString too to avoid protobuf errors
            (window as any).__originalSummaryBytesString = (window as any).SummaryBytesString;
            (window as any).SummaryBytesString = () => ['data row'];
            
            // Mock the HeaderBytesString function to return an error
            (window as any).__originalHeaderBytesString = (window as any).HeaderBytesString;
            (window as any).HeaderBytesString = () => ({ error: 'Header generation failed' });

            const summaryPass: SummaryPass = [new Uint8Array([1, 2, 3])];
            const callback = {
                processing: () => {},
                success: () => {},
                error: () => {}
            };

            await expect(async () => {
                await summaryStatistics('\t', [summaryPass], callback, false);
            }).rejects.toThrow('HeaderBytesString error: Header generation failed');
        });

        it('should handle undefined from HeaderBytesString', async () => {
            const { summaryStatistics } = await import('../../../data/operators/summaryStatistics');
            
            // Mock both functions - SummaryBytesString and HeaderBytesString
            (window as any).__originalSummaryBytesString = (window as any).SummaryBytesString;
            (window as any).SummaryBytesString = () => ['data row'];
            
            (window as any).__originalHeaderBytesString = (window as any).HeaderBytesString;
            (window as any).HeaderBytesString = () => undefined;

            const summaryPass: SummaryPass = [new Uint8Array([1, 2, 3])];
            const callback = {
                processing: () => {},
                success: () => {},
                error: () => {}
            };

            const result = await summaryStatistics('\t', [summaryPass], callback, false);
            expect(result.header).toBe('');
        });

        it('should handle non-string from HeaderBytesString', async () => {
            const { summaryStatistics } = await import('../../../data/operators/summaryStatistics');
            
            // Mock SummaryBytesString to avoid protobuf errors
            (window as any).__originalSummaryBytesString = (window as any).SummaryBytesString;
            (window as any).SummaryBytesString = () => ['data row'];
            
            // Mock the HeaderBytesString function to return a non-string
            (window as any).__originalHeaderBytesString = (window as any).HeaderBytesString;
            (window as any).HeaderBytesString = () => 12345;

            const summaryPass: SummaryPass = [new Uint8Array([1, 2, 3])];
            const callback = {
                processing: () => {},
                success: () => {},
                error: () => {}
            };

            await expect(async () => {
                await summaryStatistics('\t', [summaryPass], callback, false);
            }).rejects.toThrow('HeaderBytesString returned non-string: number');
        });
    });

    describe('createEmptyBlock (via summaryStatistics)', () => {
        it('should handle error from CreateEmptyBlock WASM function', async () => {
            const { summaryStatistics } = await import('../../../data/operators/summaryStatistics');
            
            // Mock all WASM functions to avoid protobuf errors
            (window as any).__originalSummaryBytesString = (window as any).SummaryBytesString;
            (window as any).SummaryBytesString = () => ['data row'];
            
            (window as any).__originalHeaderBytesString = (window as any).HeaderBytesString;
            (window as any).HeaderBytesString = () => 'header';
            
            // Mock CreateEmptyBlock to return an error
            (window as any).__originalCreateEmptyBlock = (window as any).CreateEmptyBlock;
            (window as any).CreateEmptyBlock = () => ({ error: 'Failed to create empty block' });

            // Create passes with different lengths to trigger empty block creation
            const pass1: SummaryPass = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
            const pass2: SummaryPass = [new Uint8Array([7, 8, 9])]; // Shorter, needs padding

            const callback = {
                processing: () => {},
                success: () => {},
                error: () => {}
            };

            await expect(async () => {
                await summaryStatistics('\t', [pass1, pass2], callback, false);
            }).rejects.toThrow('CreateEmptyBlock error: Failed to create empty block');
        });

        it('should handle non-Uint8Array from CreateEmptyBlock', async () => {
            const { summaryStatistics } = await import('../../../data/operators/summaryStatistics');
            
            // Mock all WASM functions
            (window as any).__originalSummaryBytesString = (window as any).SummaryBytesString;
            (window as any).SummaryBytesString = () => ['data row'];
            
            (window as any).__originalHeaderBytesString = (window as any).HeaderBytesString;
            (window as any).HeaderBytesString = () => 'header';
            
            // Mock CreateEmptyBlock to return wrong type
            (window as any).__originalCreateEmptyBlock = (window as any).CreateEmptyBlock;
            (window as any).CreateEmptyBlock = () => 'not a Uint8Array';

            // Create passes with different lengths to trigger empty block creation
            const pass1: SummaryPass = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
            const pass2: SummaryPass = [new Uint8Array([7, 8, 9])];

            const callback = {
                processing: () => {},
                success: () => {},
                error: () => {}
            };

            await expect(async () => {
                await summaryStatistics('\t', [pass1, pass2], callback, false);
            }).rejects.toThrow('CreateEmptyBlock returned non-Uint8Array: string');
        });
    });
});
