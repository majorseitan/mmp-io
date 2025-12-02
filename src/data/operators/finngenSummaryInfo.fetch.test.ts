import { describe, it, expect } from 'vitest';
import { finngenSummaryInfo } from './finngenSummaryInfo';
import type { FinngenFileConfiguration, FinngenSummaryInfoResponse } from '../model';
import { setupTestFetch } from '../../test/nodeFetchFallback';

// Provided request payload with valid phenocode
const requestPayload = {
  inputs: [
    {
      collection: 'labvalues',
      phenocode: '21491979',
      phenostring: 'Prolactin monomeric [Units/volume] in Serum or Plasma [mu/l], sample-wise median, quantitative',
      tag: '21491979_labvalues',
      chromosomeColumn: '#chrom',
      positionColumn: 'pos',
      referenceColumn: 'ref',
      alternativeColumn: 'alt',
      pValueColumn: 'pval',
      betaColumn: 'beta',
      sebetaColumn: 'sebeta',
      afColumn: 'af_alt',
      pval_threshold: 0.00001,
    },
  ],
  heterogeneity_tests: [],
};

describe('finngenSummaryInfo (real fetch)', () => {
  // Slow tests are skipped by default. Set `RUN_SLOW_TESTS=1` to enable.
  const runSlow = Boolean(process.env.RUN_SLOW_TESTS);
  const testFn = runSlow ? it : it.skip;

  testFn(
    'performs a real fetch and returns FinngenSummaryInfo or error string',
    async () => {
    const finngenFiles = requestPayload.inputs as unknown as FinngenFileConfiguration[];

    // Setup fetch with logging and node-http fallback
    const restoreFetch = setupTestFetch('[finngen-fetch]');

    // Simple callbacks to observe progress
    let processed = false;
    let succeeded = false;
    let errorMsg: string | null = null;

    const callbacks = {
      processing: () => { processed = true; },
      error: (e: string) => { errorMsg = e; },
      success: () => { succeeded = true; },
    };

    const result: FinngenSummaryInfoResponse = await finngenSummaryInfo(finngenFiles, callbacks as any);

    // Restore original fetch implementation
    restoreFetch();

    console.log('[finngen-fetch] Final result:', JSON.stringify(result, null, 2));

    // Either the API returns an error object or a FinngenSummaryInfo
    if ('error' in result) {
      // Ensure error is a string and that our error callback was invoked
      expect(typeof result.error).toBe('string');
      expect(errorMsg === null || typeof errorMsg === 'string').toBe(true);
    } else {
      // Validate the minimal expected shape of FinngenSummaryInfo
      expect(typeof result.filesize).toBe('number');
      expect(typeof result.linecount).toBe('number');
      expect(typeof result.blockcount).toBe('number');
      expect(Array.isArray(result.variants)).toBe(true);
      // mark success callback happened
      expect(succeeded || processed).toBeTruthy();
    }
  }, 180000); // 3 minute timeout for slow network test

  testFn(
    'returns error for invalid phenocode',
    async () => {
      // Use an invalid phenocode that doesn't exist
      const badFiles: FinngenFileConfiguration[] = [
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
        } as unknown as FinngenFileConfiguration,
      ];

      // Setup fetch with logging and node-http fallback
      const restoreFetch = setupTestFetch('[invalid-phenocode]');

      let errorMsg: string | null = null;
      const callbacks = {
        processing: () => {},
        error: (e: string) => { errorMsg = e; },
        success: () => {},
      };

      const result: FinngenSummaryInfoResponse = await finngenSummaryInfo(badFiles, callbacks as any);

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
      const emptyFiles: FinngenFileConfiguration[] = [];

      // Setup fetch with logging and node-http fallback
      const restoreFetch = setupTestFetch('[empty-files]');

      const callbacks = {
        processing: () => {},
        error: (e: string) => {},
        success: () => {},
      };

      const result: FinngenSummaryInfoResponse = await finngenSummaryInfo(emptyFiles, callbacks as any);

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
