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
): Promise<{ headers: string[]; summaryPasses: SummmryPassAcumulator }  > => {
        setCallBack.processing()
        const generator = readFileInBlocks(localFile.file, pipelineConfig.buffersize);
        const firstResult = await generator.next();
        const headers = createHeader(localFile.tag);

        if (firstResult.done) {
            setCallBack.success();
            return { headers, summaryPasses:  acumulator };
        }

        const { chunk: header } = firstResult.value;
        const metadata : BlockMetadata = createFileColumnsIndex(localFile, header);

        // Now loop through the remaining rows
        for await (const { chunk: row } of generator) {
            const pass = bufferSummaryPass(row, metadata, partitions);
            acumulator.push(pass);
        }
        setCallBack.success();
    return { headers, summaryPasses:  acumulator };
};
