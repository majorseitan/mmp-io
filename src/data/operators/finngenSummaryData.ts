import type { FinngenDataRequest, FinngenSummaryDataResponse, StepCallBack } from "../model";

export const finngenSummaryData = async (
    finngenFiles : FinngenDataRequest,
    endpoint: string,
    setCallBack: StepCallBack
): Promise<FinngenSummaryDataResponse> => {
    return { error : "Not implemented"};
};

