type ProcessingCallback<P> = (process: P) => void;
type ErrorCallback<E> = (error: E) => void;
type SucessCallback<S> = (success: S) => void;

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
  filesize : number;
  linecount : number;
  variants : string[];
  blockcount : number;
};

export type FinngenSummaryData = Uint32Array[][];

export type FinngenResponse<T> = T | { error : string }

export type FinngenSummaryInfoResponse = FinngenResponse<FinngenSummaryInfo>;
export type FinngenSummaryDataResponse = FinngenResponse<FinngenSummaryData>;

export type FinngenDataRequest = {
    file_id: string;
    block_indices?: number[];
};

export type MMPBase = {
  tag: string
} & FileColumnsDefinition;

export type MMPSummaryStatistic =  MMPBase & {
  collection: string
  phenocode: string
  phenostring: string
}

export type MMPFileUpload = MMPBase & {
  fileId: string
}

export type MMPFileArtifact = MMPSummaryStatistic | MMPFileUpload;

export interface MMPRequest {
  inputs : MMPFileArtifact[]
  variants: string[]
  blocksize?: number
}

export type DelimitedText = { header : string , data : string };


export type BlockMetadata = FileColumnsIndex & {
  tag: string;
  pval_threshold: number;
  delimiter: string;
};
