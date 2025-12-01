package lib

import (
"encoding/json"
"fmt"
"strings"

"github.com/go-playground/validator/v10"
)

var validate = validator.New()

type FileColumns[T any] struct {
	ColumnChromosome      T `json:"chromosomeColumn" validate:"required"`
	ColumnPosition        T `json:"positionColumn" validate:"required"`
	ColumnReference       T `json:"referenceColumn" validate:"required"`
	ColumnAlternate       T `json:"alternativeColumn" validate:"required"`
	ColumnPValue          T `json:"pValueColumn" validate:"required"`
	ColumnBeta            T `json:"betaColumn" validate:"required"`
	ColumnSEBeta          T `json:"sebetaColumn" validate:"required"`
	ColumnAlleleFrequency T `json:"afColumn" validate:"required"`
}

type FileColumnsIndex = FileColumns[int]
type FileColumnsDefinition = FileColumns[string]

type FileConfiguration struct {
	Tag string `json:"tag" validate:"required"`
	FileColumnsDefinition
	PvalThreshold float32 `json:"pval_threshold" validate:"required"`
	Delimiter     string  `json:"delimiter" validate:"required"`
}

type BlockMetadata struct {
	Tag string `json:"tag" validate:"required"`
	FileColumnsIndex
	PvalThreshold float32 `json:"pval_threshold" validate:"required"`
	Delimiter     string  `json:"delimiter" validate:"required"`
}

func ParseFileConfiguration(data []byte, logger func(string)) (FileConfiguration, error) {
	var fileConfiguration FileConfiguration
	if err := json.Unmarshal(data, &fileConfiguration); err != nil {
		logger(fmt.Sprintf("unmarshal error: %v", err))
		return fileConfiguration, err
	}
	if err := validate.Struct(fileConfiguration); err != nil {
		logger(fmt.Sprintf("validation error: %v", err))
		return fileConfiguration, err
	}
	return fileConfiguration, nil
}

func CreateFileColumnsIndex(header []byte, configuration FileConfiguration) (BlockMetadata, error) {
	delimiter := configuration.Delimiter
	// Parse header to get column names
	headerStr := strings.TrimSpace(string(header))
	columns := strings.Split(headerStr, string(delimiter))

	// Create map of column name to index
	columnMap := make(map[string]int)
	for i, col := range columns {
		columnMap[strings.TrimSpace(col)] = i
	}

	// Helper function to find column index
	findColumn := func(columnName string) (int, error) {
		if idx, exists := columnMap[columnName]; exists {
			return idx, nil
		}
		return -1, fmt.Errorf("column %q not found in header", columnName)
	}

	// Find all required columns
	chromIdx, err := findColumn(configuration.ColumnChromosome)
	if err != nil {
		return BlockMetadata{}, err
	}

	posIdx, err := findColumn(configuration.ColumnPosition)
	if err != nil {
		return BlockMetadata{}, err
	}

	refIdx, err := findColumn(configuration.ColumnReference)
	if err != nil {
		return BlockMetadata{}, err
	}

	altIdx, err := findColumn(configuration.ColumnAlternate)
	if err != nil {
		return BlockMetadata{}, err
	}

	pvalIdx, err := findColumn(configuration.ColumnPValue)
	if err != nil {
		return BlockMetadata{}, err
	}

	betaIdx, err := findColumn(configuration.ColumnBeta)
	if err != nil {
		return BlockMetadata{}, err
	}

	seIdx, err := findColumn(configuration.ColumnSEBeta)
	if err != nil {
		return BlockMetadata{}, err
	}

	afIdx, err := findColumn(configuration.ColumnAlleleFrequency)
	if err != nil {
		return BlockMetadata{}, err
	}

	// Create and return BlockMetadata
	return BlockMetadata{
		Tag:           configuration.Tag,
		PvalThreshold: configuration.PvalThreshold,
		Delimiter:     delimiter,
		FileColumnsIndex: FileColumnsIndex{
			ColumnChromosome:      chromIdx,
			ColumnPosition:        posIdx,
			ColumnReference:       refIdx,
			ColumnAlternate:       altIdx,
			ColumnPValue:          pvalIdx,
			ColumnBeta:            betaIdx,
			ColumnSEBeta:          seIdx,
			ColumnAlleleFrequency: afIdx,
		},
	}, nil

}

// VariantsBytesWithIndex
