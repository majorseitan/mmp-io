import type { FinngenFileConfiguration, FinngenSummaryInfoResponse } from "../model";

export const finngenSummaryInfo = async (
    finngenFiles : FinngenFileConfiguration[],
    endpoint: string
): Promise<FinngenSummaryInfoResponse> => {
    return { error : "Not implemented"};
};

