import type { DelimitedText, StepCallBack, SummaryPass, SummmryPassAcumulator } from "../model";


export const summaryBytesWithIndex = (summaryPass : SummaryPass, delimiter : string, cpra: boolean = false) : string[] => {
    const result = (window as any).SummaryBytesString(summaryPass, delimiter, cpra);
    
    // Handle error response from Go WASM
    if (result && typeof result === 'object' && 'error' in result) {
        throw new Error(`SummaryBytesString error: ${result.error}`);
    }
    
    // Handle undefined/null (empty result)
    if (result === undefined || result === null) {
        return [];
    }
    
    // Ensure result is an array
    if (!Array.isArray(result)) {
        throw new Error(`SummaryBytesString returned non-array: ${typeof result}`);
    }
    
    return result;
}

const headerBytesString = (summaryPass: SummaryPass, delimiter: string, cpra: boolean): string => {
    const result = (window as any).HeaderBytesString(summaryPass, delimiter, cpra);
    
    // Handle error response from Go WASM
    if (result && typeof result === 'object' && 'error' in result) {
        throw new Error(`HeaderBytesString error: ${result.error}`);
    }
    
    // Handle undefined/null (empty result)
    if (result === undefined || result === null) {
        return '';
    }
    
    // Ensure result is a string
    if (typeof result !== 'string') {
        throw new Error(`HeaderBytesString returned non-string: ${typeof result}`);
    }
    
    return result;
}

/**
 * Creates an empty protobuf block with the same header as a reference block
 * This is used to pad passes when they have different numbers of blocks
 */
const createEmptyBlock = (referenceBlock: Uint8Array): Uint8Array => {
    const result = (window as any).CreateEmptyBlock(referenceBlock);
    
    // Handle error response from Go WASM
    if (result && typeof result === 'object' && 'error' in result) {
        throw new Error(`CreateEmptyBlock error: ${result.error}`);
    }
    
    // Ensure result is a Uint8Array
    if (!(result instanceof Uint8Array)) {
        throw new Error(`CreateEmptyBlock returned non-Uint8Array: ${typeof result}`);
    }
    
    return result;
}

export const summaryStatistics = async (
    delimiter: string,
    acumulator: SummmryPassAcumulator,
    setCallBack: StepCallBack,
    cpra: boolean = true
): Promise<DelimitedText> => {
    setCallBack.processing()

    // Find the maximum number of blocks across all files
    const maxBlocks = acumulator.reduce((max, pass) => Math.max(max, pass.length), 0);
    
    // Handle empty case
    if (maxBlocks === 0) {
        setCallBack.success();
        return { header: '', data: '' };
    }
    
    // Pad all passes to have the same number of blocks
    // This ensures that SummaryBytesString always sees all sources (with NA for missing data)
    for (const pass of acumulator) {
        if (pass.length > 0) {
            // Use the first block as reference for creating empty blocks
            const referenceBlock = pass[0];
            while (pass.length < maxBlocks) {
                pass.push(createEmptyBlock(referenceBlock));
            }
        }
    }
    
    // Process each block index across all files
    const allData: string[] = [];
    for (let blockIndex = 0; blockIndex < maxBlocks; blockIndex++) {
        // Collect the nth block from each file
        const blocksAcrossFiles: SummaryPass = [];
        for (const filePass of acumulator) {
            blocksAcrossFiles.push(filePass[blockIndex]);
        }
        
        // Process the blocks and get result (array of rows for this block across all files)
        const blockData = summaryBytesWithIndex(blocksAcrossFiles, delimiter, cpra);
        for (const row of blockData) {
            allData.push(row);
        }
    }
    
    // Build header line from first block of each pass (not all blocks)
    const headerPasses: SummaryPass = acumulator
        .filter(pass => pass.length > 0)
        .map(pass => pass[0]); // Take only first block from each pass
    const header = headerBytesString(headerPasses, delimiter, cpra);
    
    setCallBack.success();
    return { header, data: allData.join("\n") };
}