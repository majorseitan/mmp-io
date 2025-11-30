import { Gunzip } from 'fflate';

// Returns the index of the first newline (0x0A) in the buffer, or -1 if not found
export const firstNL = (bytes: Uint8Array): number =>bytes.indexOf(0x0A);
export const findLastNewline = (bytes: Uint8Array): number => bytes.lastIndexOf(0x0A);

export const isCompressed = async (file : File) : Promise<boolean>   => {
  const buf = await file.slice(0, 2).arrayBuffer();
  const signature = new Uint8Array(buf);
  return signature[0] === 0x1F && signature[1] === 0x8B;
} 

function gunzipTransformStream(): TransformStream<Uint8Array, Uint8Array> {
  let controllerRef: TransformStreamDefaultController<Uint8Array> | null = null;
  const gunzip = new Gunzip((decompressedChunk) => {
    // fflate may reuse the buffer; copy if you need isolation
    controllerRef?.enqueue(decompressedChunk);
  });
  
  return new TransformStream<Uint8Array, Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
    transform(chunk, controller) {
      // Ensure Uint8Array
      const u8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
      gunzip.push(u8, false);
    },
    flush(controller) {
      gunzip.push(new Uint8Array(0), true); // final = true
      controllerRef = null;
    }
  });
}


async function readBuffer(
  reader: ReadableStreamDefaultReader<any>,
  size: number) {
 const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (totalBytes <= size) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    // Ensure value is a Uint8Array
    const chunk: Uint8Array = value instanceof Uint8Array ? value : new Uint8Array(value as ArrayBufferLike);
    chunks.push(chunk);
    totalBytes += chunk.length;
    if (totalBytes > size) break;
  }

  if (totalBytes === 0) return { done: true } as const;
  if (chunks.length === 1) return { value: chunks[0], done: false } as const;

  // Merge all chunks into a single Uint8Array
  const merged = new Uint8Array(totalBytes);
  let pos = 0;
  for (const chunk of chunks) {
    merged.set(chunk, pos);
    pos += chunk.length;
  }
  return { value: merged, done: false } as const;}

export async function* readFileInBlocks(
  file : File ,
  blockSize : number= 8 * 1024 * 1024
) {
  const decompressionStream = gunzipTransformStream();//new DecompressionStream('gzip');
  const compressed = await isCompressed(file);
  const stream = compressed ? file.stream().pipeThrough(decompressionStream) : file.stream();
   
  let reader = stream.getReader();

  let leftover: Uint8Array = new Uint8Array(0);
  let offset = 0;

  // Yield first line
  {
    const { value, done } = await readBuffer(reader, blockSize);
    if (!done && value) {
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      const firstLineEnd = firstNL(bytes);
      
      if (firstLineEnd !== -1) {
        yield {
          offset: 0,
          chunk: bytes.subarray(0, firstLineEnd + 1),
        };
        offset = firstLineEnd + 1;
        
        // Keep remainder as leftover
        if (firstLineEnd + 1 < bytes.length) {
          leftover = bytes.subarray(firstLineEnd + 1);
        }
      } else {
        // No newline found, keep as leftover
        leftover = bytes;
      }
    }
  }
  
  // Continue yielding remaining data
  while (true) {

    // Read new data from stream
    const { value, done } = await readBuffer(reader, blockSize);
    if (done) break;
    const newBytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    
    // Combine with any leftover from previous iteration
    let combined: Uint8Array;
    if (leftover.length > 0) {
      const temp = new Uint8Array(leftover.length + newBytes.length);
      temp.set(leftover, 0);
      temp.set(newBytes, leftover.length);
      combined = temp;
      leftover = new Uint8Array(0);
    } else {
      combined = newBytes;
    }

    let lastNL = findLastNewline(combined);
    if (lastNL === -1) {
      console.debug(`[readFileInBlocks] No newline found in block, leftover length: ${combined.length}, offset: ${offset}`);
      // Keep leftover to combine with next read - do NOT advance offset yet
      leftover = combined;
      continue;
    }

    const emitLen = lastNL + 1;
    const chunk = combined.subarray(0, emitLen);
    console.debug(`[readFileInBlocks] Yielding chunk at offset ${offset}, length: ${chunk.length}`);
    yield {
      offset,
      chunk,
    };
    offset += emitLen;

    leftover =
      emitLen < combined.length
        ? combined.subarray(emitLen)
        : new Uint8Array(0);
  }

  if (leftover.length > 0) {
    console.debug(`[readFileInBlocks] Yielding final leftover at offset ${offset}, length: ${leftover.length}`);
    yield {
      offset,
      chunk: leftover,
    };
  }
}
