import type { DelimitedText, StepCallBack, SummaryPass, SummmryPassAcumulator } from "../model";


const summaryBytesWithIndex = (summaryPass : SummaryPass, delimiter : string) : string[] => {
    const result : string[] = (window as any).SummaryBytesString(summaryPass, delimiter);
    return result;
}


export const summaryStatistics = async (
    delimiter: string,
    acumulator: SummmryPassAcumulator,
    setCallBack: StepCallBack
): Promise<DelimitedText[]> => {

    return [];
}