import type { FinngenDataRequest, FinngenSummaryDataResponse, StepCallBack } from "../model";

const API_BASE = import.meta.env?.VITE_API_BASE || "https://mmp.finngen.fi";

export const finngenSummaryData = async (
    finngenRequest: FinngenDataRequest,
    setCallBack: StepCallBack<void, string, void>
): Promise<FinngenSummaryDataResponse> => {
    setCallBack.processing();

    try {
        const jobId = finngenRequest.file_id

        const blockIndices = finngenRequest.block_indices ?? [];
        if (blockIndices.length === 0) {
            throw new Error('No block_indices specified in request');
        }

        const blockPromises = blockIndices.map(async (blockIndex) => {
            const url = `${API_BASE}/api/jobs/${jobId}/blocks/${blockIndex}`;
            const response = await fetch(url);

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Fetch block ${blockIndex} failed: ${response.status} ${response.statusText} - ${text}`);
            }

            // Expect binary data (protobuf or similar) - parse as Uint8Array
            const arrayBuffer = await response.arrayBuffer();
            console.log(`Fetched block ${blockIndex}, size: ${arrayBuffer.byteLength} bytes`);
            return new Uint8Array(arrayBuffer);
        });

        const blocks = await Promise.all(blockPromises);

        setCallBack.success();
        return blocks;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setCallBack.error(message);
        return { error: message };
    }
};
