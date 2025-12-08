#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'node:fs';
import type { PipelineConfiguration, StepCallBack } from "../../../data/model";
import { facade } from "../../../data/pipeline/facade";
import { setupTestFetch } from "../../../test/nodeFetchFallback";
import { loadWasm } from "../../wasmLoader";
import { loadConfig, normalizeFinngenFile, parseArgs, parseLocalFile } from "./common";

function printUsage() {
    console.log(`
Usage: tsx facade.harness.ts --config <config-file> --variants <variants-file> <local-file.tsv>

Arguments:
  --config <path>      Path to JSON config file with FinnGen artifacts
  --variants <path>    Path to file containing list of variants (one per line)
  --output <path>      Output file path (default: /tmp/meta-analysis-result.tsv)
  <tsv-file>           Local TSV file to process

Config file format:
{
    "finngenFiles": [
        {
            "key": "AB1_ASPERGILLOSIS",
            "collection": "public-metaresults-fg-ukbb",
            "phenostring": "Aspergillosis",
            "pval_threshold": 0.0001
        }
    ],
    "pipelineConfig": {
        "buffersize": 131072,
        "blocksize": 3
    },
    "localFileConfig": {
        "chromosomeColumn": "#chrom",
        "positionColumn": "pos",
        "referenceColumn": "ref",
        "alternativeColumn": "alt",
        "pValueColumn": "pval",
        "betaColumn": "beta",
        "sebetaColumn": "sebeta",
        "afColumn": "af_alt",
        "delimiter": "\\t"
    }
}

Variants file format:
  One variant per line in format: CHR:POS:REF:ALT
  Example:
    1:100001:A:G
    1:100002:C:T
    1:100003:G:A

Local TSV file format:
  Required columns: CHR, POS, REF, ALT, PVAL, BETA, SE, AF
  Tab-delimited with header row

Example:
  tsx facade.harness.ts --config test.1.config --variants variants.txt my-gwas.tsv --output result.tsv
    `);
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printUsage();
        process.exit(0);
    }
    
    // Parse arguments
    const { configPath, outputPath, localFilePaths, variantsPath } = parseArgs(args);
    
    // Validate arguments
    if (!configPath) {
        console.error('Error: --config argument is required');
        printUsage();
        process.exit(1);
    }
    
    if (!variantsPath) {
        console.error('Error: --variants argument is required');
        printUsage();
        process.exit(1);
    }
    
    if (localFilePaths.length === 0) {
        console.error('Error: At least one local TSV file is required');
        printUsage();
        process.exit(1);
    }
    
    if (localFilePaths.length > 1) {
        console.error('Error: facade.harness only supports processing one local file at a time');
        process.exit(1);
    }
    
    // Load config
    console.log(`Loading config from: ${configPath}`);
    const config = loadConfig(configPath!);
    
    // Normalize FinnGen files with default column values
    const finngenFiles = config.finngenFiles.map(normalizeFinngenFile);
    
    console.log(`Found ${finngenFiles.length} FinnGen file(s) in config`);
    
    // Load variants
    console.log(`\nLoading variants from: ${variantsPath}`);
    const variantsContent = readFileSync(variantsPath, 'utf-8');
    const variants = variantsContent
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && !line.startsWith('#'));
    
    console.log(`Found ${variants.length} variant(s)`);
    if (variants.length === 0) {
        console.error('Error: No variants found in variants file');
        process.exit(1);
    }
    
    // Parse local file
    console.log(`\nParsing local file: ${localFilePaths[0]}`);
    const localFile = await parseLocalFile(localFilePaths[0], config.localFileConfig);
    console.log(`  ✓ Parsed successfully`);
    
    // Setup pipeline config
    const pipelineConfig: PipelineConfiguration = config.pipelineConfig || {
        buffersize: 1024 * 1024,
        blocksize: 1024 * 1024
    };
    
    const callback: StepCallBack = {
        processing: () => {
            console.log('Processing...');
        },
        success: () => {
            console.log('Success');
        },
        error: () => {
            console.error('Error occurred');
        }
    };
    
    // Initialize WASM
    console.log('\nInitializing WASM...');
    await loadWasm();
    
    // Setup fetch for FinnGen API
    setupTestFetch('[facade-harness]');
    
    // Run facade pipeline
    console.log('\nRunning facade pipeline...');
    console.log(`Processing: ${localFile.tag}`);
    
    const result = await facade(
        variants,
        localFile,
        finngenFiles,
        pipelineConfig,
        callback
    );
    
    if ('error' in result) {
        console.error(`Pipeline error for ${localFile.tag}:`, result.error);
        throw new Error(result.error);
    }
    
    // Write result
    const output = `${result.header}\n${result.data}`;
    writeFileSync(outputPath, output);
    
    const rowCount = result.data.split('\n').filter((line: string) => line.trim()).length;
    console.log(`✓ Written ${rowCount} rows to ${outputPath}`);
    console.log('\n✓ Processing complete!');
}

main().catch(err => {
    console.error('\n✗ Fatal error:', err);
    process.exit(1);
});
