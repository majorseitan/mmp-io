import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import type { FinngenFileArtifact, LocalFileConfiguration, PipelineConfiguration } from "../../../data/model";

// Local type for config file parsing (before normalization)
export type ConfigFile = {
    key?: string;
    collection?: string;
    phenostring?: string;
    phenocode?: string;
    chromosomeColumn?: string;
    positionColumn?: string;
    referenceColumn?: string;
    alternativeColumn?: string;
    pValueColumn?: string;
    betaColumn?: string;
    sebetaColumn?: string;
    afColumn?: string;
    pval_threshold?: number;
};

export interface Config {
    finngenFiles: ConfigFile[];
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

/**
 * Normalizes a FinnGen file configuration with default column values
 */
export function normalizeFinngenFile(file: ConfigFile): FinngenFileArtifact {
    // FinnGen files use standard column names
    return {
        tag: file.key || file.phenocode || 'finngen',
        collection: file.collection || 'public-metaresults-fg-ukbb',
        phenocode: file.phenocode || file.key || '',
        phenostring: file.phenostring || file.phenocode || file.key || '',
        chromosomeColumn: file.chromosomeColumn || '#chrom',
        positionColumn: file.positionColumn || 'pos',
        referenceColumn: file.referenceColumn || 'ref',
        alternativeColumn: file.alternativeColumn || 'alt',
        pValueColumn: file.pValueColumn || 'pval',
        betaColumn: file.betaColumn || 'beta',
        sebetaColumn: file.sebetaColumn || 'sebeta',
        afColumn: file.afColumn || 'af_alt',
        pval_threshold: file.pval_threshold || 0.05
    } as FinngenFileArtifact;
}

/**
 * Parses a local file into a LocalFileConfiguration object
 * Uses Node.js openAsBlob to create a File object without loading into memory
 */
export async function parseLocalFile(filepath: string, fileConfig?: Config['localFileConfig']): Promise<LocalFileConfiguration> {
    // Use Node.js openAsBlob to create a File object without loading into memory
    // The file will be streamed in chunks when accessed
    const { openAsBlob } = await import('node:fs');
    
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

/**
 * Loads and parses a configuration file
 */
export function loadConfig(configPath: string): Config {
    const configContent = readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configContent);
    
    if (!config.finngenFiles || !Array.isArray(config.finngenFiles)) {
        throw new Error('Config must contain "finngenFiles" array');
    }
    
    return config;
}

/**
 * Parses command line arguments for config and output paths
 */
export function parseArgs(args: string[]): {
    configPath?: string;
    outputPath: string;
    localFilePaths: string[];
    variantsPath?: string;
} {
    let configPath: string | undefined;
    let outputPath = '/tmp/meta-analysis-result.tsv';
    let variantsPath: string | undefined;
    const localFilePaths: string[] = [];
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--config' && i + 1 < args.length) {
            configPath = resolve(args[i + 1]);
            i++;
        } else if (args[i] === '--output' && i + 1 < args.length) {
            outputPath = resolve(args[i + 1]);
            i++;
        } else if (args[i] === '--variants' && i + 1 < args.length) {
            variantsPath = resolve(args[i + 1]);
            i++;
        } else if (!args[i].startsWith('--')) {
            localFilePaths.push(resolve(args[i]));
        }
    }
    
    return { configPath, outputPath, localFilePaths, variantsPath };
}
