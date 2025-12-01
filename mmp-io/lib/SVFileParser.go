package lib

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"

	"google.golang.org/protobuf/proto"
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

func parseAssociationStatistic(buffer []string, indexHeader FileColumnsIndex) (*AssociationStatistic, error) {
	pval, err := parseFloat32(buffer[indexHeader.ColumnPValue])
	if err != nil {
		return nil, fmt.Errorf("invalid pvalue: %w", err)
	}
	beta, err := parseFloat32(buffer[indexHeader.ColumnBeta])
	if err != nil {
		return nil, fmt.Errorf("invalid beta: %w", err)
	}
	sebeta, err := parseFloat32(buffer[indexHeader.ColumnSEBeta])
	if err != nil {
		return nil, fmt.Errorf("invalid sebeta: %w", err)
	}
	af, err := parseFloat32(buffer[indexHeader.ColumnAlleleFrequency])
	if err != nil {
		return nil, fmt.Errorf("invalid allele frequency: %w", err)
	}
	assoc := &AssociationStatistic{
		PValue: pval,
		Beta:   beta,
		Sebeta: sebeta,
		Af:     af,
	}
	return assoc, nil
}

func serializeAssociationStatistic(assocStat *AssociationStatistic) []string {
	pvalue := fmt.Sprintf("%e", assocStat.PValue)
	beta := fmt.Sprintf("%f", assocStat.Beta)
	sebeta := fmt.Sprintf("%f", assocStat.Sebeta)
	af := fmt.Sprintf("%f", assocStat.Af)
	return []string{pvalue, beta, sebeta, af}
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

func unmarshalSummaryRows(data [][]byte) ([]map[string]*SummaryValues, error) {
	result := make([]map[string]*SummaryValues, len(data))
	for i, blockBytes := range data {
		summaryRows := &SummaryRows{}
		if err := proto.Unmarshal(blockBytes, summaryRows); err != nil {
			return nil, fmt.Errorf("unmarshal block %d: %w", i, err)
		}
		result[i] = summaryRows.Rows
	}
	return result, nil
}

func marshalSummaryRows(result []map[string]*SummaryValues) ([][]byte, error) {
	blockBytes := make([][]byte, len(result))
	for i := range result {
		v := result[i]
		summaryRows := &SummaryRows{Rows: v}
		var err error
		blockBytes[i], err = proto.Marshal(summaryRows)
		if err != nil {
			return nil, err
		}

	}
	return blockBytes, nil
}

func BufferSummaryPasses(buffer []byte, metadata BlockMetadata, partitions VariantPartitions) ([][]byte, error) {
	dataReader := bytes.NewReader(buffer)
	tableReader := csv.NewReader(dataReader)
	tableReader.Comma = rune(metadata.Delimiter[0])
	result := make([]map[string]*SummaryValues, 0)

	variantSet := make(map[string]int)
	for i, group := range partitions {
		for _, v := range group {
			variantSet[v] = i
		}
		result = append(result, make(map[string]*SummaryValues))
	}

	requiredLen := max(metadata.FileColumnsIndex.ColumnChromosome, metadata.FileColumnsIndex.ColumnPosition,
		metadata.FileColumnsIndex.ColumnReference, metadata.FileColumnsIndex.ColumnAlternate,
		metadata.FileColumnsIndex.ColumnBeta, metadata.FileColumnsIndex.ColumnSEBeta,
		metadata.FileColumnsIndex.ColumnPValue, metadata.FileColumnsIndex.ColumnAlleleFrequency) + 1
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

		parseVariant, err := parseVariant(row, metadata.FileColumnsIndex)
		if err != nil {
			return nil, err
		}

		key := variantKey(parseVariant, metadata.Delimiter)

		if index, ok := variantSet[key]; ok {

			assoc, err := parseAssociationStatistic(row, metadata.FileColumnsIndex)
			if err != nil {
				return nil, err
			}
			statistics := serializeAssociationStatistic(assoc)
			result[index][key] = &SummaryValues{Values: statistics}
		}
	}

	marshaledRows, err := marshalSummaryRows(result)
	if err != nil {
		return nil, err
	}

	return marshaledRows, nil
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

func SummaryBytesString(buffer [][]byte, delimiter string) ([]string, error) {
	rows, err := unmarshalSummaryRows(buffer)
	if err != nil {
		return nil, err
	}

	variantSet := make(map[string]bool)
	for _, rowMap := range rows {
		for variant := range rowMap {
			variantSet[variant] = true
		}
	}

	// Convert set to slice
	variants := make([]string, 0, len(variantSet))
	for variant := range variantSet {
		variants = append(variants, variant)
	}

	result := make([]string, len(variants))

	for i, variant := range variants {
		values := make([]string, 0)
		for _, rowMap := range rows {
			if summaryValues, ok := rowMap[variant]; ok {
				// Collect all values from this partition for this variant
				values = append(values, summaryValues.Values...)
			}
		}
		result[i] = strings.Join(values, delimiter)
	}

	return result, nil
}

func FileHeader(tag string) []string {
	return []string{
		fmt.Sprintf("%s_pval", tag),
		fmt.Sprintf("%s_beta", tag),
		fmt.Sprintf("%s_sebta", tag),
		fmt.Sprintf("%s_af", tag),
	}
}
