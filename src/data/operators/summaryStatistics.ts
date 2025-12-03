import type { DelimitedText, StepCallBack, SummaryPass, SummmryPassAcumulator } from "../model";


const summaryBytesWithIndex = (summaryPass : SummaryPass, delimiter : string) : string => {
    const result : string[] = (window as any).SummaryBytesString(summaryPass, delimiter);
    return result.join("\n");
}

const HeaderBytesString = (delimiter : string) => (summaryPass : SummaryPass) : string => {
    const result : string = (window as any).HeaderBytesString(summaryPass, delimiter);
    return result;
}


export const summaryStatistics = async (
    delimiter: string,
    acumulator: SummmryPassAcumulator,
    setCallBack: StepCallBack
): Promise<DelimitedText> => {
    setCallBack.processing()

    // Find the maximum number of blocks across all files
    const maxBlocks = Math.max(...acumulator.map(pass => pass.length));
    
    // Process each block index across all files
    const allData: string[] = [];
    for (let blockIndex = 0; blockIndex < maxBlocks; blockIndex++) {
        // Collect the nth block from each file
        const blocksAcrossFiles: SummaryPass = [];
        for (const filePass of acumulator) {
            if (blockIndex < filePass.length) {
                blocksAcrossFiles.push(filePass[blockIndex]);
            }
        }
        
        // Process the blocks and get result
        const data = summaryBytesWithIndex(blocksAcrossFiles, delimiter);
        allData.push(data);
    }
    
    // Build header line from all files
    const header = acumulator.map(HeaderBytesString(delimiter)).join(delimiter);
    
    setCallBack.success();
    return { header, data: allData.join("\n") };
}