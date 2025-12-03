import { readFileInBlocks } from "../fileReader";
import { toGoFileColumnsDefinition, type BlockMetadata, type GoFileColumnsDefinition, type LocalFileConfiguration , type PipelineConfiguration, type StepCallBack, type VariantPartitions, type SummmryPassAcumulator, type DelimitedText } from "../model";
import { collectVariants } from "../operators/collectVariants";
import { collectRows } from "../operators/collectRows";
import { summaryStatistics } from "../operators/summaryStatistics";
export const simplePpipeline = async (
    localFile: LocalFileConfiguration,
    pipelineConfig: PipelineConfiguration,
    setCallBack: StepCallBack
): Promise<DelimitedText> => {
    setCallBack.processing();

    // 1) collect variants from the file
    const variants = await collectVariants(localFile, pipelineConfig, setCallBack);

    // Build partitions: all variants become one partition
    const partitions: VariantPartitions = [variants];

    // 2) collect rows -> returns headers and accumulated SummaryPasses
    const acumulator: SummmryPassAcumulator = [];
    const { headers, summaryPasses } = await collectRows(localFile, acumulator, partitions, pipelineConfig, setCallBack);

    // 3) call summaryStatistics
    const result = await summaryStatistics(localFile.delimiter, summaryPasses, setCallBack);
    setCallBack.success();
    return result;
};