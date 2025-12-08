import { collectRows } from "../operators/collectRows";
import { collectVariants } from "../operators/collectVariants";
import { finngenSummaryData } from "../operators/finngenSummaryData";
import { finngenSummaryInfo } from "../operators/finngenSummaryInfo";
import { summaryStatistics } from "../operators/summaryStatistics";
import { computePartitions, summaryCallback } from "./utility";

/**
 * Main facade for the pipeline
 * @param {string[]} variants - Array of variant strings
 * @param {LocalFileConfiguration} localFile - Local file configuration
 * @param {FinngenFileArtifact[]} inputs - FinnGen file artifacts
 * @param {PipelineConfiguration} pipelineConfig - Pipeline configuration
 * @param {StepCallBack} setCallBack - Callback handlers
 * @returns {Promise<DelimitedText | OperationError>}
 */
export const facade = async (
    variants,
    localFile,
    inputs,
    pipelineConfig,
    setCallBack = {
        processing: () => {},
        success: () => {},
        error: () => {}
    },
    variants_delimiter = ':',
) => {
    variants = variants.map(v => v.replaceAll(variants_delimiter,'\t'));
    setCallBack.processing();

    const finngenRequest = {
        inputs: inputs,
        variants,
        block_size: pipelineConfig.blocksize
    };
    
    const summaryInfo = await finngenSummaryInfo(finngenRequest, summaryCallback(setCallBack));

    if ('error' in summaryInfo) {
        setCallBack.error();
        return summaryInfo;
    }
        const partitions = computePartitions(variants, summaryInfo.variants, pipelineConfig.blocksize);

    const finngenDataRequest = {
        file_id: summaryInfo.file_id,
        block_indices: Array.from({ length: summaryInfo.blockcount }, (_, i) => i)  
    };

    const summaryData = await finngenSummaryData(finngenDataRequest, summaryCallback(setCallBack))
    if ('error' in summaryData) {
        setCallBack.error();
        return summaryData;
    }

    
    const acumulator = [summaryData];
    const summaryPasses = await collectRows(localFile, acumulator, partitions, pipelineConfig, setCallBack);

    const result = await summaryStatistics(localFile.delimiter, summaryPasses, setCallBack);
    setCallBack.success();
    return result;
};
