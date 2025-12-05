import { writeFileSync } from 'node:fs';
import type { FinngenFileArtifact, LocalFileConfiguration, PipelineConfiguration, StepCallBack } from "../../../data/model";
import { smallPpipeline } from "../../../data/pipeline/small";
import { setupTestFetch } from "../../../test/nodeFetchFallback";
import { validFinngenRequest } from "../../../test/finngenTestFixtures";
import { loadWasm } from "../../wasmLoader";

const fileContent =
                'CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF\n' +
                '1\t100001\tA\tG\t0.001\t0.5\t0.1\t0.3\n' +
                '1\t100002\tC\tT\t0.002\t0.4\t0.12\t0.25\n' +
                '1\t100003\tG\tA\t0.003\t0.3\t0.15\t0.2\n' +
                '1\t100004\tT\tC\t0.004\t0.2\t0.18\t0.15\n' +
                '1\t100005\tA\tG\t0.005\t0.1\t0.2\t0.1\n' +
                '1\t100006\tC\tT\t0.006\t0.15\t0.22\t0.12\n' +
                '1\t100007\tG\tA\t0.007\t0.25\t0.25\t0.18\n' +
                '1\t100008\tT\tC\t0.008\t0.35\t0.28\t0.22\n';

const file = new File([fileContent], 'test-partitions.tsv', { type: 'text/plain' });

const localFile: LocalFileConfiguration = {
                tag: 'partition_test',
                chromosomeColumn: 'CHR',
                positionColumn: 'POS',
                referenceColumn: 'REF',
                alternativeColumn: 'ALT',
                pValueColumn: 'PVAL',
                betaColumn: 'BETA',
                sebetaColumn: 'SE',
                afColumn: 'AF',
                pval_threshold: 0.05,
                delimiter: '\t',
                file
};


const finngenInputs: FinngenFileArtifact[] = validFinngenRequest.inputs;

const pipelineConfig: PipelineConfiguration = {
                buffersize: 128 * 1024,
                blocksize: 3 // Small block size to test partitioning
            };

const callback: StepCallBack = {
                processing: () => {},
                success: () => {},
                error: () => {}
            };

(async () => {
    await loadWasm();
    
    const restoreFetch = setupTestFetch('[partition-test]');

    const result = await smallPpipeline(localFile, finngenInputs, pipelineConfig, callback);

    if ('error' in result) {
        console.error('Pipeline error:', result.error);
        return;
    }
    
    // Write result to /tmp/test.tsv
    const output = `${result.header}\n${result.data}`;
    writeFileSync('/tmp/test.tsv', output);
    console.log('Result written to /tmp/test.tsv');
    console.log(`Total data rows: ${result.data.split('\n').length}`);
})().catch(err => {
    console.error('Error:', err);
});