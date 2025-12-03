import { readFileInBlocks } from "../fileReader";
import { toGoFileColumnsDefinition, type BlockMetadata, type GoFileColumnsDefinition, type LocalFileConfiguration , type PipelineConfiguration, type StepCallBack, type VariantPartitions, type SummmryPassAcumulator, type DelimitedText, type FinngenRequest, type FinngenFileArtifact, type FinngenSummaryInfo, type FinngenSummaryInfoResponse, type FinngenDataRequest } from "../model";
import { collectVariants } from "../operators/collectVariants";
import { collectRows } from "../operators/collectRows";
import { summaryStatistics } from "../operators/summaryStatistics";
import { finngenSummaryData } from "../operators/finngenSummaryData";
import { finngenSummaryInfo } from "../operators/finngenSummaryInfo";

const summaryCallback = (callBack : StepCallBack<void,void,void>) : StepCallBack<void,string,void> => ({
        processing: () => callBack.processing(),
        success: () => callBack.success(),
        error: (err: string) => { console.log(err); callBack.error(); }
    });


const computePartitions = (localVariants: string[], finngenPartitions: string[][], blockSize : number) : VariantPartitions => {
    // Create a set of all variants in finngen partitions for fast lookup
    const finngenVariantSet = new Set<string>();
    for (const partition of finngenPartitions) {
        for (const variant of partition) {
            finngenVariantSet.add(variant);
        }
    }

    // Filter out variants that are in finngen partitions
    const remainingVariants = localVariants.filter(v => !finngenVariantSet.has(v));

    // Break remaining variants into blockSize partitions
    const localPartitions: VariantPartitions = [];
    for (let i = 0; i < remainingVariants.length; i += blockSize) {
        localPartitions.push(remainingVariants.slice(i, i + blockSize));
    }
 
    // Return finngen partitions followed by local partitions
    return [...finngenPartitions, ...localPartitions];
}

export const smallPpipeline = async (
    localFile: LocalFileConfiguration,
    inputs : FinngenFileArtifact[],
    pipelineConfig: PipelineConfiguration,
    setCallBack: StepCallBack
): Promise<DelimitedText> => {
    setCallBack.processing();

    // 1) collect variants from the file
    const variants = await collectVariants(localFile, pipelineConfig, setCallBack);

    // 3) get FinngenRequest
    const finngenRequest : FinngenRequest = {
        inputs,
        variants,
        block_size: pipelineConfig.blocksize
    };
    // 3) 
    
    const summaryInfo : FinngenSummaryInfoResponse= await finngenSummaryInfo(finngenRequest, summaryCallback(setCallBack));

    if ('error' in summaryInfo) {
        setCallBack.error();
        return { header: '', data: '' };
    }
    const partitions: VariantPartitions = computePartitions(variants, summaryInfo.variants, pipelineConfig.blocksize);


    const finngenDataRequest: FinngenDataRequest = {
        file_id: summaryInfo.file_id,
        block_indices: Array.from({ length: summaryInfo.blockcount }, (_, i) => i)  
    };

    const summaryData = await finngenSummaryData(finngenDataRequest, summaryCallback(setCallBack))
    if ('error' in summaryData) {
        setCallBack.error();
        return { header: '', data: '' };
    }

    
    const acumulator: SummmryPassAcumulator = [summaryData];
    const summaryPasses = await collectRows(localFile, acumulator, partitions, pipelineConfig, setCallBack);

    // 3) call summaryStatistics
    const result = await summaryStatistics(localFile.delimiter, summaryPasses, setCallBack);
    setCallBack.success();
    return result;
};