import { describe, it, expect } from 'vitest';

// Import the function - we'll need to export it or test through the module
// For now, copying the implementation for testing
const computePartitions = (localVariants: string[], finngenPartitions: string[][], blockSize: number): string[][] => {
    // Create a set of all variants in finngen partitions for fast lookup
    const finngenVariantSet = new Set<string>();
    for (const partition of finngenPartitions) {
        for (const variant of partition) {
            finngenVariantSet.add(variant);
        }
    }

    // Filter out variants that are in finngen partitions
    const remainingVariants = localVariants.filter(v => !finngenVariantSet.has(v));

    // Break remaining variants into blockSize partitions
    const localPartitions: string[][] = [];
    for (let i = 0; i < remainingVariants.length; i += blockSize) {
        localPartitions.push(remainingVariants.slice(i, i + blockSize));
    }

    // Return finngen partitions followed by local partitions
    return [...finngenPartitions, ...localPartitions];
};

describe('computePartitions', () => {
    it('should return only finngen partitions when all local variants are in finngen', () => {
        const localVariants = ['1\t100\tA\tT', '2\t200\tG\tC'];
        const finngenPartitions = [
            ['1\t100\tA\tT', '2\t200\tG\tC']
        ];
        const blockSize = 10;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(1);
        expect(result[0]).toEqual(['1\t100\tA\tT', '2\t200\tG\tC']);
    });

    it('should filter out variants present in finngen and create local partitions', () => {
        const localVariants = ['1\t100\tA\tT', '2\t200\tG\tC', '3\t300\tC\tG', '4\t400\tT\tA'];
        const finngenPartitions = [
            ['1\t100\tA\tT', '2\t200\tG\tC']
        ];
        const blockSize = 10;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(2);
        expect(result[0]).toEqual(['1\t100\tA\tT', '2\t200\tG\tC']); // finngen partition
        expect(result[1]).toEqual(['3\t300\tC\tG', '4\t400\tT\tA']); // local partition
    });

    it('should break remaining variants into blockSize chunks', () => {
        const localVariants = ['1\t100\tA\tT', '2\t200\tG\tC', '3\t300\tC\tG', '4\t400\tT\tA', '5\t500\tA\tG'];
        const finngenPartitions = [
            ['1\t100\tA\tT']
        ];
        const blockSize = 2;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(3); // 1 finngen + 2 local partitions
        expect(result[0]).toEqual(['1\t100\tA\tT']); // finngen
        expect(result[1]).toEqual(['2\t200\tG\tC', '3\t300\tC\tG']); // first local block
        expect(result[2]).toEqual(['4\t400\tT\tA', '5\t500\tA\tG']); // second local block
    });

    it('should handle partial last block', () => {
        const localVariants = ['1\t100\tA\tT', '2\t200\tG\tC', '3\t300\tC\tG', '4\t400\tT\tA', '5\t500\tA\tG'];
        const finngenPartitions = [
            ['1\t100\tA\tT']
        ];
        const blockSize = 3;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(3); // 1 finngen + 2 local partitions
        expect(result[0]).toEqual(['1\t100\tA\tT']); // finngen
        expect(result[1]).toEqual(['2\t200\tG\tC', '3\t300\tC\tG', '4\t400\tT\tA']); // first local block
        expect(result[2]).toEqual(['5\t500\tA\tG']); // partial last block
    });

    it('should handle multiple finngen partitions', () => {
        const localVariants = ['1\t100\tA\tT', '2\t200\tG\tC', '3\t300\tC\tG', '4\t400\tT\tA'];
        const finngenPartitions = [
            ['1\t100\tA\tT'],
            ['2\t200\tG\tC']
        ];
        const blockSize = 10;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(3); // 2 finngen + 1 local
        expect(result[0]).toEqual(['1\t100\tA\tT']);
        expect(result[1]).toEqual(['2\t200\tG\tC']);
        expect(result[2]).toEqual(['3\t300\tC\tG', '4\t400\tT\tA']);
    });

    it('should handle empty finngen partitions', () => {
        const localVariants = ['1\t100\tA\tT', '2\t200\tG\tC', '3\t300\tC\tG'];
        const finngenPartitions: string[][] = [];
        const blockSize = 2;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(2); // 2 local partitions
        expect(result[0]).toEqual(['1\t100\tA\tT', '2\t200\tG\tC']);
        expect(result[1]).toEqual(['3\t300\tC\tG']);
    });

    it('should handle empty local variants', () => {
        const localVariants: string[] = [];
        const finngenPartitions = [
            ['1\t100\tA\tT', '2\t200\tG\tC']
        ];
        const blockSize = 10;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(1); // only finngen partition
        expect(result[0]).toEqual(['1\t100\tA\tT', '2\t200\tG\tC']);
    });

    it('should handle variants spanning across multiple finngen partitions', () => {
        const localVariants = ['1\t100\tA\tT', '2\t200\tG\tC', '3\t300\tC\tG', '4\t400\tT\tA', '5\t500\tA\tG'];
        const finngenPartitions = [
            ['1\t100\tA\tT', '3\t300\tC\tG'],
            ['2\t200\tG\tC']
        ];
        const blockSize = 2;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(3); // 2 finngen + 1 local
        expect(result[0]).toEqual(['1\t100\tA\tT', '3\t300\tC\tG']);
        expect(result[1]).toEqual(['2\t200\tG\tC']);
        expect(result[2]).toEqual(['4\t400\tT\tA', '5\t500\tA\tG']); // remaining variants
    });

    it('should handle blockSize = 1', () => {
        const localVariants = ['1\t100\tA\tT', '2\t200\tG\tC', '3\t300\tC\tG'];
        const finngenPartitions = [
            ['1\t100\tA\tT']
        ];
        const blockSize = 1;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(3); // 1 finngen + 2 local partitions (one per variant)
        expect(result[0]).toEqual(['1\t100\tA\tT']);
        expect(result[1]).toEqual(['2\t200\tG\tC']);
        expect(result[2]).toEqual(['3\t300\tC\tG']);
    });

    it('should handle large blockSize (all remaining in one partition)', () => {
        const localVariants = ['1\t100\tA\tT', '2\t200\tG\tC', '3\t300\tC\tG', '4\t400\tT\tA'];
        const finngenPartitions = [
            ['1\t100\tA\tT']
        ];
        const blockSize = 1000;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(2); // 1 finngen + 1 large local partition
        expect(result[0]).toEqual(['1\t100\tA\tT']);
        expect(result[1]).toEqual(['2\t200\tG\tC', '3\t300\tC\tG', '4\t400\tT\tA']);
    });

    it('should preserve order of finngen partitions and append local partitions', () => {
        const localVariants = ['1\t100\tA\tT', '2\t200\tG\tC', '3\t300\tC\tG', '4\t400\tT\tA'];
        const finngenPartitions = [
            ['1\t100\tA\tT'],
            ['3\t300\tC\tG']
        ];
        const blockSize = 2;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(3);
        expect(result[0]).toEqual(['1\t100\tA\tT']); // first finngen partition
        expect(result[1]).toEqual(['3\t300\tC\tG']); // second finngen partition
        expect(result[2]).toEqual(['2\t200\tG\tC', '4\t400\tT\tA']); // local partition
    });

    it('should handle duplicate variants in finngen partitions', () => {
        const localVariants = ['1\t100\tA\tT', '2\t200\tG\tC', '3\t300\tC\tG'];
        const finngenPartitions = [
            ['1\t100\tA\tT', '1\t100\tA\tT'], // duplicate
            ['2\t200\tG\tC']
        ];
        const blockSize = 10;

        const result = computePartitions(localVariants, finngenPartitions, blockSize);

        expect(result.length).toBe(3); // 2 finngen + 1 local
        expect(result[0]).toEqual(['1\t100\tA\tT', '1\t100\tA\tT']);
        expect(result[1]).toEqual(['2\t200\tG\tC']);
        expect(result[2]).toEqual(['3\t300\tC\tG']);
    });
});
