import { type DelimitedText, type FinngenDataRequest, type FinngenFileArtifact, type FinngenRequest, type FinngenSummaryInfoResponse, type LocalFileConfiguration, type OperationError, type PipelineConfiguration, type StepCallBack, type SummmryPassAcumulator, type VariantPartitions } from "../model";
import { collectRows } from "../operators/collectRows";
import { collectVariants } from "../operators/collectVariants";
import { finngenSummaryData } from "../operators/finngenSummaryData";
import { finngenSummaryInfo } from "../operators/finngenSummaryInfo";
import { summaryStatistics } from "../operators/summaryStatistics";
import { computePartitions, summaryCallback } from "./utility";

export const smallPpipeline = async (
    localFile: LocalFileConfiguration,
    inputs : FinngenFileArtifact[],
    pipelineConfig: PipelineConfiguration,
    setCallBack: StepCallBack
): Promise<DelimitedText | OperationError> => {
    setCallBack.processing();

    const variants = await collectVariants(localFile, pipelineConfig, setCallBack);

    const finngenRequest : FinngenRequest = {
        inputs,
        variants,
        block_size: pipelineConfig.blocksize
    };
    
    const summaryInfo : FinngenSummaryInfoResponse= await finngenSummaryInfo(finngenRequest, summaryCallback(setCallBack));

    if ('error' in summaryInfo) {
        setCallBack.error();
        return summaryInfo;
    }
    const partitions: VariantPartitions = computePartitions(variants, summaryInfo.variants, pipelineConfig.blocksize);

    const finngenDataRequest: FinngenDataRequest = {
        file_id: summaryInfo.file_id,
        block_indices: Array.from({ length: summaryInfo.blockcount }, (_, i) => i)  
    };

    const summaryData = await finngenSummaryData(finngenDataRequest, summaryCallback(setCallBack))
    if ('error' in summaryData) {
        setCallBack.error();
        return summaryData;
    }

    
    const acumulator: SummmryPassAcumulator = [summaryData];
    const summaryPasses = await collectRows(localFile, acumulator, partitions, pipelineConfig, setCallBack);

    const result = await summaryStatistics(localFile.delimiter, summaryPasses, setCallBack);
    setCallBack.success();
    return result;
};