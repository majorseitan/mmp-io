import type { MMPRequest, MMPSummaryStatistic } from '../data/model';

/**
 * Shared test fixtures for Finngen API tests
 */

// Valid phenocode request payload used across multiple tests
export const validFinngenRequest: MMPRequest = {
  inputs: [
    {
      collection: 'labvalues',
      phenocode: '21491979',
      phenostring: 'Prolactin monomeric [Units/volume] in Serum or Plasma [mu/l], sample-wise median, quantitative',
      tag: 'labvalues_21491979',
      chromosomeColumn: '#chrom',
      positionColumn: 'pos',
      referenceColumn: 'ref',
      alternativeColumn: 'alt',
      pValueColumn: 'pval',
      betaColumn: 'beta',
      sebetaColumn: 'sebeta',
      afColumn: 'af_alt',
      pval_threshold: 0.00001,
    } as MMPSummaryStatistic,
  ],
  variants: [],
  block_size: 10,
};

// Expected headers for the valid payload response
export const expectedHeaders = [
  "chrom",
  "pos",
  "ref",
  "alt",
  "labvalues_21491979_pval",
  "labvalues_21491979_beta",
  "labvalues_21491979_sebeta",
  "labvalues_21491979_af",
  "labvalues_21491979_pip",
  "labvalues_21491979_cs"
];

/**
 * Creates a simple callback set for tracking API call progress
 */
export function createSimpleCallbacks() {
  let processed = false;
  let succeeded = false;
  let errorMsg: string | null = null;

  const callbacks = {
    processing: () => { processed = true; },
    error: (e: string) => { errorMsg = e; },
    success: () => { succeeded = true; },
  };

  return { callbacks, getState: () => ({ processed, succeeded, errorMsg }) };
}

/**
 * Creates a logging callback set for verbose test output
 */
export function createLoggingCallbacks(prefix: string) {
  let processed = false;
  let succeeded = false;
  let errorMsg: string | null = null;

  const callbacks = {
    processing: () => { 
      processed = true; 
      console.log(`[${prefix}-callback] processing`); 
    },
    error: (e: string) => { 
      errorMsg = e; 
      console.log(`[${prefix}-callback] error:`, e); 
    },
    success: () => { 
      succeeded = true; 
      console.log(`[${prefix}-callback] success`); 
    },
  };

  return { callbacks, getState: () => ({ processed, succeeded, errorMsg }) };
}
