type ProcessingCallback<P> = (process: P) => void;
type ErrorCallback<E> = (error: E) => void;
type SucessCallback<S> = (success: S) => void;

export type PipelineConfiguration = {
  buffersize: number;
  blocksize: number;
};

export type StepCallBack<P = void, E = void, S = void> = {
  processing: ProcessingCallback<P>;
  error: ErrorCallback<E>;
  success: SucessCallback<S>;
};

export interface FileColumns<T> {
  chromosomeColumn: T;
  positionColumn: T;
  referenceColumn: T;
  alternativeColumn: T;
  pValueColumn: T;
  betaColumn: T;
  sebetaColumn: T;
  afColumn: T;
}

// Concrete specializations
export type FileColumnsIndex = FileColumns<number>;
export type FileColumnsDefinition = FileColumns<string>;

export type FileConfiguration = FileColumnsDefinition & {
    tag: string
    pval_threshold: number
}

export type FileConfigurationDelimiter = { delimiter: string }; 

export type GoFileColumnsDefinition  = FileConfiguration & FileConfigurationDelimiter;
export type LocalFileConfiguration =
  FileConfiguration & 
  FileConfigurationDelimiter &
  { file: File; }


export const toGoFileColumnsDefinition = ({ file: _, ...rest }: LocalFileConfiguration): GoFileColumnsDefinition => rest;

export type FinngenFileConfiguration = FileConfiguration & {
    collection: string
    phenocode: string
}



export type FinngenSummaryInfo = {
  file_id: string;
  filesize : number;
  linecount : number;
  variants : string[][];
  blockcount : number;
  headers : string[];
};

export type FinngenResponse<T> = T | { error : string }

export type FinngenSummaryInfoResponse = FinngenResponse<FinngenSummaryInfo>;
export type FinngenSummaryDataResponse = FinngenResponse<SummaryPass>;

export type FinngenDataRequest = {
    file_id: string;
    block_indices?: number[];
};


export type FinngenSummaryStatistic =  FinngenFileConfiguration & {  phenostring: string }

export type FinngenFileUpload = FileConfiguration & {  fileId: string }

export type FinngenFileArtifact = FinngenSummaryStatistic | FinngenFileUpload;

export interface FinngenRequest {
  inputs : FinngenFileArtifact[]
  variants: string[]
  block_size?: number
}

export type DelimitedText = { header : string , data : string };


export type BlockMetadata = FileConfiguration & {  delimiter: string; };


// what is an intutive name for these types
export type SummaryRow = string[]
// Protobuf marshaled SummaryRows for one partition
export type SummaryBlock = Uint8Array
// All blocks from all partitions in one pass
export type SummaryPass = SummaryBlock[]
// all the passes
export type SummmryPassAcumulator = SummaryPass[]

export type VariantPartitions = string[][];
