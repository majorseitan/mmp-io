#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import type { LocalFileConfiguration, PipelineConfiguration, StepCallBack } from "../../../data/model";
import { smallPpipeline } from "../../../data/pipeline/small";
import { setupTestFetch } from "../../../test/nodeFetchFallback";
import { loadWasm } from "../../wasmLoader";
import { loadConfig, normalizeFinngenFile, parseArgs, parseLocalFile } from "./common";

function printUsage() {
    console.log(`
Usage: tsx cli.harness.ts --config <config-file> <local-file-1.tsv> [local-file-2.tsv ...]

Arguments:
  --config <path>    Path to JSON config file with FinnGen artifacts
  <tsv-files>        One or more local TSV files to process

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
    }
}

Local TSV file format:
  Required columns: CHR, POS, REF, ALT, PVAL, BETA, SE, AF
  Tab-delimited with header row

Example:
  tsx cli.harness.ts --config test.1.config my-gwas.tsv --output result.tsv
    `);
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printUsage();
        process.exit(0);
    }
    
    // Parse arguments
    const { configPath, outputPath, localFilePaths } = parseArgs(args);
    
    // Validate arguments
    if (!configPath) {
        console.error('Error: --config argument is required');
        printUsage();
        process.exit(1);
    }
    
    if (localFilePaths.length === 0) {
        console.error('Error: At least one local TSV file is required');
        printUsage();
        process.exit(1);
    }
    
    // Load config
    console.log(`Loading config from: ${configPath}`);
    const config = loadConfig(configPath!);
    
    // Normalize FinnGen files with default column values
    const finngenFiles = config.finngenFiles.map(normalizeFinngenFile);
    
    console.log(`Found ${finngenFiles.length} FinnGen file(s) in config`);
    
    // Parse local files
    console.log(`\nParsing ${localFilePaths.length} local file(s)...`);
    const localFiles: LocalFileConfiguration[] = [];
    for (const filepath of localFilePaths) {
        console.log(`  - ${filepath}`);
        const localFile = await parseLocalFile(filepath, config.localFileConfig);
        localFiles.push(localFile);
        console.log(`    ✓ Parsed successfully`);
    }
    
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
    setupTestFetch('[cli-harness]');
    
    // Run pipeline for each local file
    console.log('\nRunning meta-analysis pipeline...');
    for (const localFile of localFiles) {
        console.log(`\nProcessing: ${localFile.tag}`);
        
        const result = await smallPpipeline(
            localFile,
            finngenFiles,
            pipelineConfig,
            callback
        );
        
        if ('error' in result) {
            console.error(`Pipeline error for ${localFile.tag}:`, result.error);
            throw new Error(result.error);
        }
        
        // Generate output filename
        const outputFile = localFiles.length === 1
            ? outputPath
            : outputPath.replace(/(\.[^.]+)?$/, `-${localFile.tag}$1`);
        
        // Write result
        const output = `${result.header}\n${result.data}`;
        writeFileSync(outputFile, output);
        
        const rowCount = result.data.split('\n').filter((line: string) => line.trim()).length;
        console.log(`✓ Written ${rowCount} rows to ${outputFile}`);
    }
    
    console.log('\n✓ All files processed successfully!');
}

main().catch(err => {
    console.error('\n✗ Fatal error:', err);
    process.exit(1);
});
