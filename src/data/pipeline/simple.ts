import { type DelimitedText, type LocalFileConfiguration, type PipelineConfiguration, type StepCallBack, type SummmryPassAcumulator, type VariantPartitions } from "../model";
import { collectRows } from "../operators/collectRows";
import { collectVariants } from "../operators/collectVariants";
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
    const summaryPasses = await collectRows(localFile, acumulator, partitions, pipelineConfig, setCallBack);

    // 3) call summaryStatistics
    const result = await summaryStatistics(localFile.delimiter, summaryPasses, setCallBack);
    setCallBack.success();
    return result;
};