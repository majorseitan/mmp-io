import { describe, it, expect } from 'vitest';
import { finngenSummaryInfo } from '../../../data/operators/finngenSummaryInfo';
import type { FinngenSummaryInfoResponse, MMPRequest, MMPSummaryStatistic } from '../../../data/model';
import { setupTestFetch } from '../../nodeFetchFallback';
import { validFinngenRequest, expectedHeaders, createSimpleCallbacks } from '../../finngenTestFixtures';

describe('finngenSummaryInfo (real fetch)', () => {
  // Slow tests are skipped by default. Set `RUN_SLOW_TESTS=1` to enable.
  const runSlow = Boolean(process.env.RUN_SLOW_TESTS);
  const testFn = runSlow ? it : it.skip;

  testFn(
    'performs a real fetch and returns FinngenSummaryInfo or error string',
    async () => {
    const restoreFetch = setupTestFetch('[finngen-fetch]');
    const { callbacks, getState } = createSimpleCallbacks();

    const result: FinngenSummaryInfoResponse = await finngenSummaryInfo(validFinngenRequest, callbacks as any);

    // Restore original fetch implementation
    restoreFetch();

    // Either the API returns an error object or a FinngenSummaryInfo
    if ('error' in result) {
      expect(typeof result.error).toBe('string');
      expect(getState().errorMsg === null || typeof getState().errorMsg === 'string').toBe(true);
    } else {
      expect(typeof result.filesize).toBe('number');
      expect(typeof result.linecount).toBe('number');
      expect(typeof result.blockcount).toBe('number');
      expect(result.blockcount).toBe(11);
      expect(result.headers).toEqual(expectedHeaders);
      expect(result.variants.length).toBe(11);
      expect(Array.isArray(result.variants)).toBe(true);
      const { succeeded, processed } = getState();
      expect(succeeded || processed).toBeTruthy();
    }
  }, 180000); // 3 minute timeout for slow network test

  testFn(
    'returns error for invalid phenocode',
    async () => {
      const badRequest: MMPRequest = {
        inputs: [
          {
            chromosomeColumn: '#chrom',
            positionColumn: 'pos',
            referenceColumn: 'ref',
            alternativeColumn: 'alt',
            pValueColumn: 'pval',
            betaColumn: 'beta',
            sebetaColumn: 'sebeta',
            afColumn: 'af_alt',
            tag: 'invalid_test',
            phenostring: 'Invalid phenotype for testing',
            pval_threshold: 0.00001,
            collection: 'invalid_collection',
            phenocode: 'DOES_NOT_EXIST_999999',
          } as MMPSummaryStatistic,
        ],
        variants: [],
      };

      const restoreFetch = setupTestFetch('[invalid-phenocode]');
      const { callbacks } = createSimpleCallbacks();

      const result: FinngenSummaryInfoResponse = await finngenSummaryInfo(badRequest, callbacks as any);

      // Restore original fetch
      restoreFetch();

      // Should return an error object
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
        // Should mention either 404 or "not found" or failed
        expect(result.error.toLowerCase()).toMatch(/404|not found|failed/);
      }
    },
    30000
  ); // 30 second timeout

  testFn(
    'returns error for empty files array',
    async () => {
      const emptyRequest: MMPRequest = { inputs: [], variants: [] };
      const restoreFetch = setupTestFetch('[empty-files]');
      const { callbacks } = createSimpleCallbacks();

      const result: FinngenSummaryInfoResponse = await finngenSummaryInfo(emptyRequest, callbacks as any);

      // Restore original fetch
      restoreFetch();

      // Should return an error
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(typeof result.error).toBe('string');
      }
    },
    30000
  ); // 30 second timeout
});
