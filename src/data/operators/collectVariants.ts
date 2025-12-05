import { readFileInBlocks } from "../fileReader";
import { toGoFileColumnsDefinition, type BlockMetadata, type GoFileColumnsDefinition, type LocalFileConfiguration , type PipelineConfiguration, type StepCallBack } from "../model";


export const createFileColumnsIndex = (localFile: LocalFileConfiguration, header: Uint8Array<ArrayBufferLike>) : BlockMetadata => {
    const config : GoFileColumnsDefinition = toGoFileColumnsDefinition(localFile);
    const result = (window as any).CreateFileColumnsIndex(header, JSON.stringify(config));
    
    // Handle error response from Go WASM
    if (result && typeof result === 'object' && 'error' in result) {
        throw new Error(`CreateFileColumnsIndex error: ${result.error}`);
    }
    
    const metadata = JSON.parse(result) as BlockMetadata;
    return metadata;
}

export const bufferVariants = (buffer: Uint8Array<ArrayBufferLike>, metadata: BlockMetadata) : string[] => {
    const result = (window as any).BufferVariants(buffer, JSON.stringify(metadata));
    return result as string[];
}

export const collectVariants = async (
    localFile : LocalFileConfiguration,
    pipelineConfig: PipelineConfiguration,
    setCallBack: StepCallBack
): Promise<string[]> => {
    setCallBack.processing()
    const generator = readFileInBlocks(localFile.file, pipelineConfig.buffersize);
    const firstResult = await generator.next();
    
    if (firstResult.done) { 
        setCallBack.success();
        return []; 
    }
    const result : string[] = [];
    const { chunk: header } = firstResult.value;
    const metadata = createFileColumnsIndex(localFile, header);

    // Now loop through the remaining rows
    for await (const { chunk: row } of generator) {
        const variants = bufferVariants(row, metadata);
        // Use concat or loop instead of spread operator to avoid stack overflow with large arrays
        for (const variant of variants) {
            result.push(variant);
        }
    }
    setCallBack.success();
    return result;
}
