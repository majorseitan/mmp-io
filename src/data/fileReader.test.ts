import { describe, it, expect } from 'vitest';
import { isCompressed, readFileInBlocks, firstNL, findLastNewline } from './fileReader';

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
  });


});
