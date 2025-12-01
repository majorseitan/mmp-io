import { describe, it, expect, beforeAll } from 'vitest';
import { wasmReady } from '../../data/wasm';

describe('FileHeader WASM binding', () => {
    beforeAll(async () => {
        await wasmReady;
    });

    it('returns expected header fields for a tag', () => {
        const fn = (window as any).FileHeader;
        expect(typeof fn).toBe('function');

        const res = fn('file1');
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBe(4);
        expect(res[0]).toBe('file1_pval');
        expect(res[1]).toBe('file1_beta');
        expect(res[2]).toBe('file1_sebta');
        expect(res[3]).toBe('file1_af');
    });
});
