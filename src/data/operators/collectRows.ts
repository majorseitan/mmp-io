import { readFileInBlocks } from "../fileReader";
import type { BlockMetadata, LocalFileConfiguration, PipelineConfiguration, StepCallBack, SummaryPass, SummmryPassAcumulator, VariantPartitions } from "../model";
import { createFileColumnsIndex } from "./collectVariants";

const bufferSummaryPass = (buffer: Uint8Array<ArrayBufferLike>, metadata: BlockMetadata, partitions: VariantPartitions) : SummaryPass => {
    const result : SummaryPass = (window as any).BufferSummaryPasses(buffer, JSON.stringify(metadata), partitions);
    return result;
}


const createHeader : (tag: string) => string [] = (tag : string) => (window as any).CreateHeader(tag);

export const collectRows = async (
    localFile : LocalFileConfiguration,
    acumulator: SummmryPassAcumulator,
    partitions: VariantPartitions,
    pipelineConfig: PipelineConfiguration,
    setCallBack: StepCallBack
): Promise<SummmryPassAcumulator> => {
        setCallBack.processing()
        const generator = readFileInBlocks(localFile.file, pipelineConfig.buffersize);
        const firstResult = await generator.next();

        if (firstResult.done) {
            setCallBack.success();
            return acumulator;
        }

        const { chunk: header } = firstResult.value;
        const metadata : BlockMetadata = createFileColumnsIndex(localFile, header);

        // Collect all blocks from this file into one pass
        const localPass: SummaryPass = [];
        
        // Now loop through the remaining rows
        for await (const { chunk: row } of generator) {
            const pass = bufferSummaryPass(row, metadata, partitions);
            localPass.push(...pass);
        }
        
        // Add the complete local file pass to the accumulator
        acumulator.push(localPass);
        
        setCallBack.success();
    return acumulator;
};
