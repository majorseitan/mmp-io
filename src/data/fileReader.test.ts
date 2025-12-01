import { describe, it, expect } from 'vitest';
import { isCompressed, readFileInBlocks, firstNL, findLastNewline } from './fileReader';

async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

describe('fileReader', () => {
  describe('firstNL', () => {
    it('should find first newline in buffer', () => {
      const bytes = new TextEncoder().encode('hello\nworld\n');
      const result = firstNL(bytes);
      expect(result).toBe(5);
    });

    it('should return -1 when no newline exists', () => {
      const bytes = new TextEncoder().encode('no newline here');
      const result = firstNL(bytes);
      expect(result).toBe(-1);
    });

    it('should handle empty buffer', () => {
      const bytes = new Uint8Array(0);
      const result = firstNL(bytes);
      expect(result).toBe(-1);
    });

    it('should find newline at start of buffer', () => {
      const bytes = new TextEncoder().encode('\nstart with newline');
      const result = firstNL(bytes);
      expect(result).toBe(0);
    });

    it('should find first of multiple newlines', () => {
      const bytes = new TextEncoder().encode('line1\nline2\nline3\n');
      const result = firstNL(bytes);
      expect(result).toBe(5);
    });
  });

  describe('findLastNewline', () => {
    it('should find last newline in buffer', () => {
      const bytes = new TextEncoder().encode('hello\nworld\n');
      const result = findLastNewline(bytes);
      expect(result).toBe(11);
    });

    it('should return -1 when no newline exists', () => {
      const bytes = new TextEncoder().encode('no newline here');
      const result = findLastNewline(bytes);
      expect(result).toBe(-1);
    });

    it('should handle empty buffer', () => {
      const bytes = new Uint8Array(0);
      const result = findLastNewline(bytes);
      expect(result).toBe(-1);
    });

    it('should find newline at end of buffer', () => {
      const bytes = new TextEncoder().encode('ends with newline\n');
      const result = findLastNewline(bytes);
      expect(result).toBe(17);
    });

    it('should find last of multiple newlines', () => {
      const bytes = new TextEncoder().encode('line1\nline2\nline3\n');
      const result = findLastNewline(bytes);
      expect(result).toBe(17);
    });

    it('should return same index when only one newline', () => {
      const bytes = new TextEncoder().encode('single\nnewline');
      const result = findLastNewline(bytes);
      expect(result).toBe(6);
    });
  });

  describe('isCompressed', () => {
    it('should return true for gzip compressed files', async () => {
      // GZIP magic number: 0x1F 0x8B
      const gzipData = new Uint8Array([0x1F, 0x8B, 0x08, 0x00]);
      const file = new File([gzipData], 'test.gz', { type: 'application/gzip' });
      
      const result = await isCompressed(file);
      
      expect(result).toBe(true);
    });

    it('should return false for uncompressed files', async () => {
      const textData = new TextEncoder().encode('plain text file');
      const file = new File([textData], 'test.txt', { type: 'text/plain' });
      
      const result = await isCompressed(file);
      
      expect(result).toBe(false);
    });

    it('should handle empty files', async () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' });
      
      const result = await isCompressed(file);
      
      expect(result).toBe(false);
    });
  });

  describe('readFileInBlocks', () => {
    it('should yield first line from uncompressed file', async () => {
      const content = 'header line\ndata line 1\ndata line 2\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const generator = readFileInBlocks(file, 1024);
      const firstResult = await generator.next();
      
      expect(firstResult.done).toBe(false);
      expect(firstResult.value?.offset).toBe(0);
      
      const decoder = new TextDecoder();
      const firstLine = decoder.decode(firstResult.value?.chunk);
      expect(firstLine).toBe('header line\n');
    });

    it('should yield all chunks from multi-line file', async () => {
      const content = 'line1\nline2\nline3\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        chunks.push(decoder.decode(chunk));
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toBe('line1\n');
    });

    it('should handle small block sizes', async () => {
      const content = 'a'.repeat(100) + '\n' + 'b'.repeat(100) + '\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: Uint8Array[] = [];
      
      for await (const { chunk } of readFileInBlocks(file, 50)) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle file without trailing newline', async () => {
      const content = 'header\ndata without newline at end';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        chunks.push(decoder.decode(chunk));
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toBe('header\n');
    });

    it('should maintain correct offsets', async () => {
      const content = '12345\n67890\nabcde\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const offsets: number[] = [];
      
      for await (const { offset } of readFileInBlocks(file, 1024)) {
        offsets.push(offset);
      }
      
      expect(offsets[0]).toBe(0);
      if (offsets.length > 1) {
        expect(offsets[1]).toBeGreaterThan(0);
      }
    });

    it('should handle single line file', async () => {
      const content = 'single line\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        chunks.push(decoder.decode(chunk));
      }
      
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe('single line\n');
    });

    it('should handle empty file', async () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' });
      
      const chunks: Uint8Array[] = [];
      
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBe(0);
    });

    it('should handle file with no newlines', async () => {
      const content = 'no newlines in this file at all';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        chunks.push(decoder.decode(chunk));
      }
      
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(content);
    });

    it('should handle very large blocks spanning multiple reads', async () => {
      const line1 = 'a'.repeat(100) + '\n';
      const line2 = 'b'.repeat(100) + '\n';
      const line3 = 'c'.repeat(100) + '\n';
      const content = line1 + line2 + line3;
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      
      // Use small block size to force multiple reads
      for await (const { chunk } of readFileInBlocks(file, 50)) {
        chunks.push(decoder.decode(chunk));
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      // First chunk should be first line
      expect(chunks[0]).toBe(line1);
    });

    it('should handle blocks with leftover bytes', async () => {
      // Create content where blocks don't align with newlines
      const content = 'line1\nline2\nline3\nline4\nline5\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      
      // Use very small block size to create leftover scenarios
      for await (const { chunk } of readFileInBlocks(file, 10)) {
        chunks.push(decoder.decode(chunk));
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toBe('line1\n');
    });

    it('should handle compressed gzip files', async () => {
      // Create a simple gzip file manually
      // GZIP header: 1F 8B 08 00 00 00 00 00 00 FF
      // Compressed "test\n": 2B 49 2D 2E E1 02 00
      // CRC32 and size: XX XX XX XX 05 00 00 00
      const gzipData = new Uint8Array([
        0x1F, 0x8B, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,
        0x2B, 0x49, 0x2D, 0x2E, 0xE1, 0x02, 0x00,
        0xC6, 0x35, 0xB9, 0x3B, 0x05, 0x00, 0x00, 0x00
      ]);
      const file = new File([gzipData], 'test.gz', { type: 'application/gzip' });
      
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        chunks.push(decoder.decode(chunk));
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toBe('test\n');
    });

    it('should handle multiple chunks without newlines properly', async () => {
      // Content where first read has no newline
      const part1 = 'a'.repeat(50);
      const part2 = '\n' + 'b'.repeat(50) + '\n';
      const content = part1 + part2;
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: Uint8Array[] = [];
      
      // Small block size to force split
      for await (const { chunk } of readFileInBlocks(file, 30)) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should properly yield final leftover chunk', async () => {
      const content = 'line1\nline2\nfinal without newline';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        chunks.push(decoder.decode(chunk));
      }
      
      expect(chunks.length).toBe(2);
      expect(chunks[0]).toBe('line1\n');
      expect(chunks[1]).toContain('final without newline');
    });

    it('should handle ArrayBuffer chunks correctly', async () => {
      const content = 'test\ndata\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: Uint8Array[] = [];
      
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        expect(chunk).toBeInstanceOf(Uint8Array);
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should combine leftover with next read correctly', async () => {
      // Create scenario where leftover needs to be combined
      const content = 'short\n' + 'x'.repeat(100) + '\nmore\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      
      for await (const { chunk } of readFileInBlocks(file, 50)) {
        chunks.push(decoder.decode(chunk));
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toBe('short\n');
    });

    it('should handle chunk with no newline and combine with next', async () => {
      // Create scenario where first data chunk after header has no newline
      // This tests the continue path in the loop
      const part1 = 'header\n';
      const part2 = 'x'.repeat(40); // no newline - will be leftover
      const part3 = 'y'.repeat(40) + '\n'; // completes the line
      const content = part1 + part2 + part3;
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      
      // Small block size to force the scenario
      for await (const { chunk } of readFileInBlocks(file, 30)) {
        chunks.push(decoder.decode(chunk));
      }
      
      expect(chunks.length).toBe(2);
      expect(chunks[0]).toBe('header\n');
      // Second chunk should be the combined leftover
      expect(chunks[1].length).toBe(81); // 40 + 40 + 1 newline
    });

    it('should handle multiple consecutive chunks without newlines', async () => {
      // Tests when multiple reads are needed before finding a newline
      const header = 'h\n';
      const noNewline1 = 'a'.repeat(15);
      const noNewline2 = 'b'.repeat(15);
      const noNewline3 = 'c'.repeat(15);
      const ending = 'd'.repeat(15) + '\n';
      const content = header + noNewline1 + noNewline2 + noNewline3 + ending;
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: Uint8Array[] = [];
      
      // Very small block size
      for await (const { chunk } of readFileInBlocks(file, 10)) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBe(2);
    });

    it('should handle done flag in middle of reading', async () => {
      // Create a small file to ensure done flag is set early
      const content = 'a\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: Uint8Array[] = [];
      
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBe(1);
    });

    it('should handle value instanceof Uint8Array check', async () => {
      // Normal case - value should be Uint8Array
      const content = 'test\nline\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: Uint8Array[] = [];
      
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        expect(chunk).toBeInstanceOf(Uint8Array);
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should yield chunk with exact emitLen calculation', async () => {
      const content = 'line1\nline2\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const results: Array<{offset: number, length: number}> = [];
      
      for await (const { offset, chunk } of readFileInBlocks(file, 1024)) {
        results.push({ offset, length: chunk.length });
      }
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].offset).toBe(0);
      expect(results[0].length).toBe(6); // "line1\n"
    });

    it('should advance offset correctly after emitting', async () => {
      const content = 'abc\ndef\nghi\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const offsets: number[] = [];
      
      for await (const { offset } of readFileInBlocks(file, 1024)) {
        offsets.push(offset);
      }
      
      expect(offsets[0]).toBe(0);
      if (offsets.length > 1) {
        expect(offsets[1]).toBe(4); // After "abc\n"
      }
    });

    it('should handle leftover assignment when emitLen equals combined length', async () => {
      const content = 'exact\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: Uint8Array[] = [];
      
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBe(1);
      expect(chunks[0].length).toBe(6);
    });

    it('should process multiple blocks in main loop', async () => {
      // Create a larger file that requires multiple block reads
      const lines: string[] = [];
      for (let i = 0; i < 50; i++) {
        lines.push(`line${i}\n`);
      }
      const content = 'header\n' + lines.join('');
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: Uint8Array[] = [];
      
      // Use block size that forces multiple reads
      for await (const { chunk } of readFileInBlocks(file, 50)) {
        chunks.push(chunk);
      }
      
      // Should have header + multiple data chunks
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should handle else branch when no leftover', async () => {
      // File where each block aligns with newlines (no leftover between blocks)
      const content = 'header\n' + 'a'.repeat(20) + '\n' + 'b'.repeat(20) + '\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const chunks: Uint8Array[] = [];
      
      for await (const { chunk } of readFileInBlocks(file, 25)) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('sha256 integrity and line count verification', () => {
    it('should read all file content preserving sha256', async () => {
      const content = 'line1\nline2\nline3\nline4\nline5\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      // Calculate expected MD5
      const encoder = new TextEncoder();
      const expectedMd5 = await sha256(encoder.encode(content));
      
      // Read file and reassemble
      const chunks: Uint8Array[] = [];
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        chunks.push(chunk);
      }
      
      // Combine all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let pos = 0;
      for (const chunk of chunks) {
        combined.set(chunk, pos);
        pos += chunk.length;
      }
      
      // Verify MD5 matches
      const actualMd5 = await sha256(combined);
      expect(actualMd5).toBe(expectedMd5);
      
      // Verify content is identical
      const decoder = new TextDecoder();
      expect(decoder.decode(combined)).toBe(content);
    });

    it('should preserve line count and content for large random file', async () => {
      // Generate random file with known line count
      const lineCount = 1000;
      const lines: string[] = [];
      
      for (let i = 0; i < lineCount; i++) {
        // Generate random line with random length (10-100 chars)
        const lineLength = 10 + Math.floor(Math.random() * 90);
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let line = `${i}:`;
        for (let j = 0; j < lineLength; j++) {
          line += chars[Math.floor(Math.random() * chars.length)];
        }
        lines.push(line);
      }
      
      const content = lines.join('\n') + '\n';
      const file = new File([content], 'large.txt', { type: 'text/plain' });
      
      // Calculate expected MD5
      const encoder = new TextEncoder();
      const expectedMd5 = await sha256(encoder.encode(content));
      
      // Read file in small blocks to test chunking
      const chunks: Uint8Array[] = [];
      for await (const { chunk } of readFileInBlocks(file, 1024)) {
        chunks.push(chunk);
      }
      
      // Combine all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let pos = 0;
      for (const chunk of chunks) {
        combined.set(chunk, pos);
        pos += chunk.length;
      }
      
      // Verify MD5 matches
      const actualMd5 = await sha256(combined);
      expect(actualMd5).toBe(expectedMd5);
      
      // Verify line count
      const decoder = new TextDecoder();
      const reconstructed = decoder.decode(combined);
      const actualLines = reconstructed.split('\n').filter(line => line.length > 0);
      expect(actualLines.length).toBe(lineCount);
      
      // Verify first and last lines
      expect(actualLines[0]).toContain('0:');
      expect(actualLines[lineCount - 1]).toContain(`${lineCount - 1}:`);
      
      // Verify complete content match
      expect(reconstructed).toBe(content);
    });

    it('should preserve sha256 with very large file (10MB+)', async () => {
      // Generate 10MB+ file
      const lineSize = 100;
      const lineCount = 100000; // ~10MB
      const lines: string[] = [];
      
      for (let i = 0; i < lineCount; i++) {
        lines.push('x'.repeat(lineSize));
      }
      
      const content = lines.join('\n') + '\n';
      const file = new File([content], 'huge.txt', { type: 'text/plain' });
      
      // Calculate expected MD5
      const encoder = new TextEncoder();
      const expectedMd5 = await sha256(encoder.encode(content));
      
      // Read file in multiple blocks
      const chunks: Uint8Array[] = [];
      for await (const { chunk } of readFileInBlocks(file, 1024 * 1024)) {
        chunks.push(chunk);
      }
      
      // Combine all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let pos = 0;
      for (const chunk of chunks) {
        combined.set(chunk, pos);
        pos += chunk.length;
      }
      
      // Verify MD5 matches
      const actualMd5 = await sha256(combined);
      expect(actualMd5).toBe(expectedMd5);
      
      // Verify line count
      const decoder = new TextDecoder();
      const reconstructed = decoder.decode(combined);
      const actualLines = reconstructed.split('\n').filter(line => line.length > 0);
      expect(actualLines.length).toBe(lineCount);
    });

    it('should handle small block size preserving sha256', async () => {
      const content = 'test1\ntest2\ntest3\n';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const encoder = new TextEncoder();
      const expectedMd5 = await sha256(encoder.encode(content));
      
      // Use very small block size
      const chunks: Uint8Array[] = [];
      for await (const { chunk } of readFileInBlocks(file, 5)) {
        chunks.push(chunk);
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let pos = 0;
      for (const chunk of chunks) {
        combined.set(chunk, pos);
        pos += chunk.length;
      }
      
      const actualMd5 = await sha256(combined);
      expect(actualMd5).toBe(expectedMd5);
    });

    it('should preserve line numbers with random content', async () => {
      // Generate file with numbered lines
      const lineCount = 500;
      const lines: string[] = [];
      
      for (let i = 1; i <= lineCount; i++) {
        const padding = 'x'.repeat(Math.floor(Math.random() * 50));
        lines.push(`Line ${i}${padding}`);
      }
      
      const content = lines.join('\n') + '\n';
      const file = new File([content], 'numbered.txt', { type: 'text/plain' });
      
      // Read file
      const chunks: Uint8Array[] = [];
      for await (const { chunk } of readFileInBlocks(file, 2048)) {
        chunks.push(chunk);
      }
      
      // Combine chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let pos = 0;
      for (const chunk of chunks) {
        combined.set(chunk, pos);
        pos += chunk.length;
      }
      
      // Parse lines and verify numbering
      const decoder = new TextDecoder();
      const reconstructed = decoder.decode(combined);
      const actualLines = reconstructed.split('\n').filter(line => line.length > 0);
      
      expect(actualLines.length).toBe(lineCount);
      
      // Verify each line has correct number
      for (let i = 0; i < lineCount; i++) {
        expect(actualLines[i]).toMatch(new RegExp(`^Line ${i + 1}`));
      }
    });
  });


});
