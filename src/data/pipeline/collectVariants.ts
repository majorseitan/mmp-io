import { readFileInBlocks } from "../fileReader";
import { toGoFileColumnsDefinition, type BlockMetadata, type GoFileColumnsDefinition, type LocalFileConfiguration , type StepCallBack } from "../model";


export const createFileColumnsIndex = (localFile: LocalFileConfiguration, header: Uint8Array<ArrayBufferLike>) : BlockMetadata => {
    const config : GoFileColumnsDefinition = toGoFileColumnsDefinition(localFile);
    const result = (window as any).CreateFileColumnsIndex(header, JSON.stringify(config));
    const metadata = JSON.parse(result) as BlockMetadata;
    return metadata;
}

export const collectVariants = async (
    localFile : LocalFileConfiguration,
    setCallBack: StepCallBack
): Promise<string[]> => {
    setCallBack.processing()
    const generator = readFileInBlocks(localFile.file, 128 * 1024 * 1024);
    const firstResult = await generator.next();
    
    if (firstResult.done) { 
        setCallBack.success();
        return []; 
    }
    
    const { chunk: header } = firstResult.value;
    const metadata = createFileColumnsIndex(localFile, header);

    // Now loop through the remaining rows
    for await (const { chunk: row } of generator) {

        // Process each row
    }
    setCallBack.success();
    return [];
}
