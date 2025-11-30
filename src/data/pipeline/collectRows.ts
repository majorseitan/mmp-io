import type { LocalFileConfiguration, StepCallBack } from "../model";

export const filterVariants = async (
    localFiles : LocalFileConfiguration[],
    acumulator: Uint32Array[][],
    partitions: string[][],    
    setCallBack: StepCallBack
): Promise<Uint32Array[][]> => {
    return acumulator;
};
