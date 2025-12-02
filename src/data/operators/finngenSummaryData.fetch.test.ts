import { describe, it, expect } from 'vitest';
import { finngenSummaryInfo } from './finngenSummaryInfo';
import { finngenSummaryData } from './finngenSummaryData';
import type { FinngenSummaryInfoResponse, FinngenDataRequest, FinngenSummaryDataResponse } from '../model';
import { setupTestFetch } from '../../test/nodeFetchFallback';
import { SummaryFile } from '../../model/summaryfile';
import { validFinngenRequest, createLoggingCallbacks } from '../../test/finngenTestFixtures';

describe('finngenSummaryData (real fetch)', () => {
  // Slow tests are skipped by default. Set `RUN_SLOW_TESTS=1` to enable.
  const runSlow = Boolean(process.env.RUN_SLOW_TESTS);
  const testFn = runSlow ? it : it.skip;

  testFn(
    'creates job with finngenSummaryInfo then fetches block with finngenSummaryData and unmarshals protobuf',
    async () => {
      const restoreFetch = setupTestFetch('[finngen-data-fetch]');

      // Step 1: Create job and get summary info
      console.log('\n=== Step 1: Creating job with finngenSummaryInfo ===');
      const { callbacks: infoCallbacks } = createLoggingCallbacks('info');

      const infoResult: FinngenSummaryInfoResponse = await finngenSummaryInfo(validFinngenRequest, infoCallbacks as any);
      
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
        file_id: infoResult.file_id,
        block_indices: [0],
      };

      const { callbacks: dataCallbacks, getState } = createLoggingCallbacks('data');

      const dataResult: FinngenSummaryDataResponse = await finngenSummaryData(dataRequest, dataCallbacks as any);

      // Restore original fetch
      restoreFetch();

      console.log('[data-result] type:', Array.isArray(dataResult) ? 'SummaryPass' : 'error');

      console.log(dataResult);
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
      console.log('[protobuf] header:', summaryFile.header);
      console.log('[protobuf] rows array length:', summaryFile.rows?.length ?? 0);

      // Verify the protobuf structure
      expect(summaryFile.header).toBeDefined();
      expect(Array.isArray(summaryFile.header)).toBe(true);
      expect(summaryFile.header).toEqual([
        'labvalues_21491979_pval',
        'labvalues_21491979_beta',
        'labvalues_21491979_sebeta',
        'labvalues_21491979_af',
        'labvalues_21491979_pip',
        'labvalues_21491979_cs'
      ]);
      expect(summaryFile.rows).toBeDefined();
      expect(Array.isArray(summaryFile.rows)).toBe(true);
      expect(summaryFile.rows!.length).toBe(1);

      // Check first SummaryRows block has data
      const firstBlock = summaryFile.rows![0];
      expect(firstBlock.rows).toBeDefined();
      expect(firstBlock.rows instanceof Map).toBe(true);
      expect(firstBlock.rows.size).toBe(10);

      console.log('[protobuf] first block row count:', firstBlock.rows.size);

      // Get first entry from the map
      const firstEntry = Array.from(firstBlock.rows.entries())[0];
      const [variantKey, summaryValues] = firstEntry;
      
      console.log('[protobuf] first variant key:', variantKey);
      console.log('[protobuf] first variant values:', summaryValues.values);

      console.log(`\n[verification] Total variants in block: ${firstBlock.rows.size}`);
      console.log('[verification] First variant key:', variantKey);
      console.log('[verification] Values:', summaryValues.values.join(', '));

      // Verify all variants from infoResult are present in the block
      console.log('\n[verification] Checking all variants from infoResult are in block...');
      const blockVariantKeys = new Set(firstBlock.rows.keys());
      
      // infoResult.variants[0] contains the variants for the first file
      const expectedVariants = infoResult.variants[0];
      expect(Array.isArray(expectedVariants)).toBe(true);
      console.log(`[verification] Expected variants count: ${expectedVariants.length}`);
      console.log(`[verification] Block variants count: ${blockVariantKeys.size}`);
      
      // Check that each expected variant exists in the block
      let foundCount = 0;
      for (const variant of expectedVariants) {
        // variant is already a string in the format "chrom\tpos\tref\talt"
        if (blockVariantKeys.has(variant)) {
          foundCount++;
        } else {
          console.warn(`[verification] Variant not found in block: ${variant}`);
        }
      }
      
      console.log(`[verification] Found ${foundCount}/${expectedVariants.length} variants in block`);
      expect(foundCount).toBe(expectedVariants.length);
      expect(foundCount).toBe(10);

      // All checks passed
      expect(getState().succeeded).toBe(true);
    },
    300000
  ); // 5 minute timeout for slow network test
});
