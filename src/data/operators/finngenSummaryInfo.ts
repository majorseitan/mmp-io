import type { FinngenRequest, FinngenSummaryInfo, FinngenSummaryInfoResponse, StepCallBack } from "../model";

const API_BASE = import.meta.env.VITE_API_BASE || "https://mmp.finngen.fi";



export const finngenSummaryInfo = async (
    request: FinngenRequest,
    setCallBack: StepCallBack<void,string,void>
): Promise<FinngenSummaryInfoResponse> => {
    setCallBack.processing();
    // POST /api/jobs (or provided endpoint) to create a job and poll until completion
    const postCreateJob = async (req: FinngenRequest): Promise<{ url: string; file_id: string }> => {
        console.log("Creating job with request:", req);
        console.log("Creating blocksize:", req.block_size);
        const response = await fetch(`${API_BASE}/api/jobs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });

        const text = await response.text();
        if (!response.ok) {
            throw new Error(`Create job failed: ${response.status} ${response.statusText} - ${text}`);
        }

        const data = text ? JSON.parse(text) : {};
        if (!data.job_id) {
            throw new Error(`create-job response missing job_id: ${text}`);
        }
        return { url: `${API_BASE}/api/jobs/${data.job_id}/summary`, file_id: data.job_id };
    };

    const waitForCompletion = (params: { url: string; file_id: string }): Promise<FinngenSummaryInfo> => {
        // Poll the job URL until it completes or fails
        return new Promise((resolve, reject) => {
            const intervalId = setInterval(() => {
                fetch(params.url)
                    .then(async (r) => {
                        if (r.status === 200) {
                            clearInterval(intervalId);
                            try {
                                const json = await r.json();
                                // Direct cast to FinngenSummaryInfo as requested
                                const finngenInfo = { ...json, file_id: params.file_id } as FinngenSummaryInfo;
                                setCallBack.success();
                                resolve(finngenInfo);
                            } catch (err) {
                                reject(err);
                            }
                        } else if (r.status === 202) {
                            // still processing; continue polling
                            return;
                        } else {
                            clearInterval(intervalId);
                            setCallBack.error(`Job failed with status ${r.status} ${r.statusText}`);
                            reject(new Error(`Job failed with status ${r.status} ${r.statusText}`));
                        }
                    })
                    .catch((err) => {
                        clearInterval(intervalId);
                        const message = err instanceof Error ? err.message : String(err);
                        setCallBack.error(message);
                        reject(err);
                    });
            }, 10000);
        });
    };

    try {
        const result = await postCreateJob(request).then(waitForCompletion);
        return result;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: message };
    }
};



