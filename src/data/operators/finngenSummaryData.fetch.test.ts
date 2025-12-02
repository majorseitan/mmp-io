import { describe, it, expect } from 'vitest';
import { finngenSummaryInfo } from './finngenSummaryInfo';
import { finngenSummaryData } from './finngenSummaryData';
import type { FinngenFileConfiguration, FinngenSummaryInfoResponse, FinngenDataRequest, FinngenSummaryDataResponse } from '../model';
import { SummaryFile } from '../model/summaryfile';
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

describe('finngenSummaryData (real fetch)', () => {
  // Slow tests are skipped by default. Set `RUN_SLOW_TESTS=1` to enable.
  const runSlow = Boolean(process.env.RUN_SLOW_TESTS);
  const testFn = runSlow ? it : it.skip;

  testFn(
    'creates job with finngenSummaryInfo then fetches block with finngenSummaryData and unmarshals protobuf',
    async () => {
      const finngenFiles = requestPayload.inputs as unknown as FinngenFileConfiguration[];

      // Setup fetch with logging and node-http fallback
      const restoreFetch = setupTestFetch('[finngen-data-fetch]');

      // Step 1: Create job and get summary info
      console.log('\n=== Step 1: Creating job with finngenSummaryInfo ===');
      let infoProcessed = false;
      let infoSucceeded = false;
      let infoErrorMsg: string | null = null;

      const infoCallbacks = {
        processing: () => { infoProcessed = true; console.log('[info-callback] processing'); },
        error: (e: string) => { infoErrorMsg = e; console.log('[info-callback] error:', e); },
        success: () => { infoSucceeded = true; console.log('[info-callback] success'); },
      };

      const infoResult: FinngenSummaryInfoResponse = await finngenSummaryInfo(finngenFiles, infoCallbacks as any);

      console.log('[info-result]', JSON.stringify(infoResult, null, 2));

      // Verify we got summary info successfully
      expect('error' in infoResult).toBe(false);
      if ('error' in infoResult) {
        throw new Error(`finngenSummaryInfo failed: ${infoResult.error}`);
      }

      // Verify the structure
      expect(typeof infoResult.filesize).toBe('number');
      expect(typeof infoResult.linecount).toBe('number');
      expect(typeof infoResult.blockcount).toBe('number');
      expect(Array.isArray(infoResult.variants)).toBe(true);
      expect(infoResult.blockcount).toBeGreaterThan(0);

      console.log(`\n[info-summary] Job complete: ${infoResult.blockcount} blocks, ${infoResult.variants.length} variants`);

      // Step 2: Fetch first block using finngenSummaryData
      console.log('\n=== Step 2: Fetching block 0 with finngenSummaryData ===');
      
      const dataRequest: FinngenDataRequest = {
        file_id: finngenFiles[0].tag, // Use tag as file_id
        block_indices: [0], // Fetch first block
      };

      let dataProcessed = false;
      let dataSucceeded = false;
      let dataErrorMsg: string | null = null;

      const dataCallbacks = {
        processing: () => { dataProcessed = true; console.log('[data-callback] processing'); },
        error: (e: string) => { dataErrorMsg = e; console.log('[data-callback] error:', e); },
        success: () => { dataSucceeded = true; console.log('[data-callback] success'); },
      };

      const dataResult: FinngenSummaryDataResponse = await finngenSummaryData(dataRequest, dataCallbacks as any);

      // Restore original fetch
      restoreFetch();

      console.log('[data-result] type:', Array.isArray(dataResult) ? 'SummaryPass' : 'error');

      // Verify we got data successfully
      expect('error' in dataResult).toBe(false);
      if ('error' in dataResult) {
        throw new Error(`finngenSummaryData failed: ${dataResult.error}`);
      }

      // Should be an array of Uint8Array blocks
      expect(Array.isArray(dataResult)).toBe(true);
      expect(dataResult.length).toBe(1); // We requested 1 block
      expect(dataResult[0]).toBeInstanceOf(Uint8Array);

      console.log(`\n[data-summary] Fetched block 0: ${dataResult[0].length} bytes`);

      // Step 3: Unmarshal protobuf and verify contents
      console.log('\n=== Step 3: Unmarshalling protobuf and verifying ===');
      
      const blockData = dataResult[0];
      const summaryFile = SummaryFile.decode(blockData);

      console.log('[protobuf] decoded SummaryFile');
      console.log('[protobuf] tag:', summaryFile.tag);
      console.log('[protobuf] rows count:', summaryFile.rows?.length ?? 0);

      // Verify the protobuf structure
      expect(summaryFile.tag).toBe(finngenFiles[0].tag);
      expect(summaryFile.rows).toBeDefined();
      expect(Array.isArray(summaryFile.rows)).toBe(true);
      expect(summaryFile.rows!.length).toBeGreaterThan(0);

      // Check first row has expected structure
      const firstRow = summaryFile.rows![0];
      expect(firstRow.variant).toBeDefined();
      expect(firstRow.statistics).toBeDefined();
      expect(firstRow.statistics!.length).toBeGreaterThan(0);

      console.log('[protobuf] first variant:', firstRow.variant?.chromosome, firstRow.variant?.position, firstRow.variant?.reference, firstRow.variant?.alternative);
      console.log('[protobuf] statistics count:', firstRow.statistics!.length);

      // Verify statistics structure
      const firstStat = firstRow.statistics![0];
      expect(firstStat.pvalue).toBeDefined();
      expect(firstStat.beta).toBeDefined();
      expect(firstStat.sebeta).toBeDefined();
      expect(firstStat.af).toBeDefined();

      console.log('[protobuf] first statistic - pvalue:', firstStat.pvalue, 'beta:', firstStat.beta, 'sebeta:', firstStat.sebeta, 'af:', firstStat.af);

      // Verify variant count matches what we expect from info
      console.log(`\n[verification] Total rows in block: ${summaryFile.rows!.length}`);
      console.log('[verification] First row variant:', 
        `chr${firstRow.variant?.chromosome}:${firstRow.variant?.position}`,
        `${firstRow.variant?.reference}->${firstRow.variant?.alternative}`);
      console.log('[verification] First row pvalue:', firstStat.pvalue);

      // All checks passed
      expect(dataSucceeded).toBe(true);
    },
    300000
  ); // 5 minute timeout for slow network test
});
