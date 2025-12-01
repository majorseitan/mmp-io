package lib

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
)

func parseChromosome(s string) (uint32, error) {
	s = strings.TrimSpace(s)
	switch strings.ToUpper(s) {
	case "X":
		return 23, nil
	case "Y":
		return 24, nil
	case "MT", "M", "MITO", "MITOCHONDRIAL":
		return 25, nil
	default:
		v, err := strconv.ParseUint(s, 10, 32)
		if err != nil {
			return 0, fmt.Errorf("invalid chromosome: %s", s)
		}
		return uint32(v), nil
	}
}

func parseUint32(s string) (uint32, error) {
	v, err := strconv.ParseUint(s, 10, 32)
	return uint32(v), err
}

func parseUint64(s string) (uint64, error) {
	return strconv.ParseUint(s, 10, 64)
}

func parseFloat32(s string) (float32, error) {
	v, err := strconv.ParseFloat(s, 32)
	return float32(v), err
}

func parsePValue(buffer []string, indexHeader FileColumnsIndex) (float32, error) {
	pvalue, err := parseFloat32(buffer[indexHeader.ColumnPValue])
	if err != nil {
		return 0, fmt.Errorf("invalid pvalue: %w", err)
	}
	return pvalue, nil
}

func parseVariant(buffer []string, indexHeader FileColumnsIndex) (*Variant, error) {
	chrom, err := parseChromosome(buffer[indexHeader.ColumnChromosome])
	if err != nil {
		return nil, fmt.Errorf("invalid chromosome: %w", err)
	}
	pos, err := parseUint64(buffer[indexHeader.ColumnPosition])
	if err != nil {
		return nil, fmt.Errorf("invalid position: %w", err)
	}
	variant := &Variant{
		Chromosome: chrom,
		Position:   pos,
		Ref:        buffer[indexHeader.ColumnReference],
		Alt:        buffer[indexHeader.ColumnAlternate],
	}
	return variant, nil
}

func variantKey(variant *Variant, delimiter string) string {
	return fmt.Sprintf("%d%s%d%s%s%s%s", variant.Chromosome, delimiter, variant.Position, delimiter, variant.Ref, delimiter, variant.Alt)
}

// VariantsBytesWithIndex
func BufferVariants(buffer []byte, metadata BlockMetadata) ([]string, error) {
	dataReader := bytes.NewReader(buffer)
	tableReader := csv.NewReader(dataReader)
	tableReader.Comma = rune(metadata.Delimiter[0])

	var result []string
	requiredLen := max(metadata.FileColumnsIndex.ColumnChromosome, metadata.FileColumnsIndex.ColumnPosition,
		metadata.FileColumnsIndex.ColumnReference, metadata.FileColumnsIndex.ColumnAlternate,
		metadata.FileColumnsIndex.ColumnBeta, metadata.FileColumnsIndex.ColumnSEBeta, metadata.FileColumnsIndex.ColumnPValue) + 1
	firstRow := true

	for {
		row, err := tableReader.Read()

		if errors.Is(err, io.EOF) {
			break
		} else if errors.Is(err, io.ErrUnexpectedEOF) || errors.Is(err, csv.ErrFieldCount) {
			break
		} else if err != nil {
			return nil, err
		}

		// Validate first row has enough columns
		if firstRow {
			if len(row) < requiredLen {
				return nil, fmt.Errorf("insufficient columns: expected at least %d, got %d", requiredLen, len(row))
			}
			firstRow = false
		}

		pvalue, err := parsePValue(row, metadata.FileColumnsIndex)
		if err != nil {
			return nil, err
		}

		// Only add variant if pvalue is less than threshold
		if pvalue < metadata.PvalThreshold {
			parseVariant, err := parseVariant(row, metadata.FileColumnsIndex)
			if err != nil {
				return nil, err
			}

			key := variantKey(parseVariant, metadata.Delimiter)
			result = append(result, key)
		}
	}
	return result, nil
}
