#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FinngenFileArtifact, LocalFileConfiguration, PipelineConfiguration, StepCallBack } from "../../../data/model";
import { smallPpipeline } from "../../../data/pipeline/small";
import { setupTestFetch } from "../../../test/nodeFetchFallback";
import { loadWasm } from "../../wasmLoader";

interface Config {
    finngenFiles: FinngenFileArtifact[];
    pipelineConfig?: PipelineConfiguration;
    localFileConfig?: {
        chromosomeColumn?: string;
        positionColumn?: string;
        referenceColumn?: string;
        alternativeColumn?: string;
        pValueColumn?: string;
        betaColumn?: string;
        sebetaColumn?: string;
        afColumn?: string;
        pval_threshold?: number;
        delimiter?: string;
    };
}

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

async function parseLocalFile(filepath: string, fileConfig?: Config['localFileConfig']): Promise<LocalFileConfiguration> {
    // Use Node.js openAsBlob to create a File object without loading into memory
    // The file will be streamed in chunks when accessed
    const { openAsBlob } = await import('node:fs');
    const { basename } = await import('node:path');
    
    // openAsBlob creates a Blob-like object backed by the file descriptor
    // This allows streaming without loading the entire file into memory
    const blob = await openAsBlob(filepath);
    const file = new File([blob], basename(filepath), { 
        type: filepath.endsWith('.gz') ? 'application/gzip' : 'text/plain'
    });
    
    return {
        tag: basename(filepath).replace(/\.(tsv|txt|gz)$/i, ''),
        chromosomeColumn: fileConfig?.chromosomeColumn || 'CHR',
        positionColumn: fileConfig?.positionColumn || 'POS',
        referenceColumn: fileConfig?.referenceColumn || 'REF',
        alternativeColumn: fileConfig?.alternativeColumn || 'ALT',
        pValueColumn: fileConfig?.pValueColumn || 'PVAL',
        betaColumn: fileConfig?.betaColumn || 'BETA',
        sebetaColumn: fileConfig?.sebetaColumn || 'SE',
        afColumn: fileConfig?.afColumn || 'AF',
        pval_threshold: fileConfig?.pval_threshold || 0.05,
        delimiter: fileConfig?.delimiter || '\t',
        file
    };
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printUsage();
        process.exit(0);
    }
    
    // Parse arguments
    let configPath: string | undefined;
    let outputPath = '/tmp/meta-analysis-result.tsv';
    const localFilePaths: string[] = [];
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--config' && i + 1 < args.length) {
            configPath = resolve(args[i + 1]);
            i++;
        } else if (args[i] === '--output' && i + 1 < args.length) {
            outputPath = resolve(args[i + 1]);
            i++;
        } else if (!args[i].startsWith('--')) {
            localFilePaths.push(resolve(args[i]));
        }
    }
    
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
    const configContent = readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configContent);
    
    if (!config.finngenFiles || !Array.isArray(config.finngenFiles)) {
        console.error('Error: Config must contain "finngenFiles" array');
        process.exit(1);
    }
    
    console.log(`Found ${config.finngenFiles.length} FinnGen file(s) in config`);
    
    // Parse local files
    console.log(`\nParsing ${localFilePaths.length} local file(s)...`);
    const localFiles: LocalFileConfiguration[] = [];
    for (const filepath of localFilePaths) {
        console.log(`  - ${filepath}`);
        try {
            const localFile = await parseLocalFile(filepath, config.localFileConfig);
            localFiles.push(localFile);
            console.log(`    ✓ Parsed successfully`);
        } catch (err) {
            console.error(`Error parsing ${filepath}:`, err);
            process.exit(1);
        }
    }
    
    // Setup pipeline config
    const pipelineConfig: PipelineConfiguration = config.pipelineConfig || {
        buffersize: 1024 * 1024,
        blocksize: 1024
    };
    
    const callback: StepCallBack = {
        processing: (step: string) => {
            console.log(`Processing: ${step}`);
        },
        success: (step: string) => {
            console.log(`Success: ${step}`);
        },
        error: (step: string, error: string) => {
            console.error(`Error in ${step}: ${error}`);
        }
    };
    
    // Initialize WASM
    console.log('\nInitializing WASM...');
    await loadWasm();
    
    // Setup fetch for FinnGen API
    const restoreFetch = setupTestFetch('[cli-harness]');
    
    // Run pipeline for each local file
    console.log('\nRunning meta-analysis pipeline...');
    for (const localFile of localFiles) {
        console.log(`\nProcessing: ${localFile.tag}`);
        
        const result = await smallPpipeline(
            localFile,
            config.finngenFiles,
            pipelineConfig,
            callback
        );
        
        if ('error' in result) {
            console.error(`Pipeline error for ${localFile.tag}:`, result.error);
            process.exit(1);
        }
        
        // Generate output filename
        const outputFile = localFiles.length === 1
            ? outputPath
            : outputPath.replace(/(\.[^.]+)?$/, `-${localFile.tag}$1`);
        
        // Write result
        const output = `${result.header}\n${result.data}`;
        writeFileSync(outputFile, output);
        
        const rowCount = result.data.split('\n').filter(line => line.trim()).length;
        console.log(`✓ Written ${rowCount} rows to ${outputFile}`);
    }
    
    console.log('\n✓ All files processed successfully!');
}

main().catch(err => {
    console.error('\n✗ Fatal error:', err);
    process.exit(1);
});
