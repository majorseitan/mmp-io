package lib

import (
	"testing"
)

func TestParseFileConfiguration_ValidJSON(t *testing.T) {
	validJSON := []byte(`{
		"tag": "test_config",
		"chromosomeColumn": "CHR",
		"positionColumn": "POS",
		"referenceColumn": "REF",
		"alternativeColumn": "ALT",
		"pValueColumn": "PVAL",
		"betaColumn": "BETA",
		"sebetaColumn": "SE",
		"afColumn": "AF",
		"pval_threshold": 0.05,
		"delimiter": "\t"
	}`)

	logger := func(msg string) {
		t.Logf("Logger: %s", msg)
	}

	config, err := ParseFileConfiguration(validJSON, logger)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if config.Tag != "test_config" {
		t.Errorf("Expected tag 'test_config', got '%s'", config.Tag)
	}

	if config.ColumnChromosome != "CHR" {
		t.Errorf("Expected column_chromosome 'CHR', got '%s'", config.ColumnChromosome)
	}

	if config.ColumnPosition != "POS" {
		t.Errorf("Expected column_position 'POS', got '%s'", config.ColumnPosition)
	}

	if config.PvalThreshold != 0.05 {
		t.Errorf("Expected pval_threshold 0.05, got %f", config.PvalThreshold)
	}
}

func TestParseFileConfiguration_InvalidJSON(t *testing.T) {
	invalidJSON := []byte(`{
		"name": "test_config",
		"invalid_field"
	}`)

	logger := func(msg string) {
		t.Logf("Logger: %s", msg)
	}

	_, err := ParseFileConfiguration(invalidJSON, logger)

	if err == nil {
		t.Fatal("Expected error for invalid JSON, got none")
	}
}

func TestParseFileConfiguration_MissingRequiredFields(t *testing.T) {
	tests := []struct {
		name string
		json string
	}{
		{
			name: "missing tag",
			json: `{
				"chromosomeColumn": "CHR",
				"positionColumn": "POS",
				"referenceColumn": "REF",
				"alternativeColumn": "ALT",
				"pValueColumn": "PVAL",
				"betaColumn": "BETA",
				"sebetaColumn": "SE",
				"afColumn": "AF",
				"pval_threshold": 0.05,
				"delimiter": "\t"
			}`,
		},
		{
			name: "missing chromosomeColumn",
			json: `{
				"tag": "test",
				"positionColumn": "POS",
				"referenceColumn": "REF",
				"alternativeColumn": "ALT",
				"pValueColumn": "PVAL",
				"betaColumn": "BETA",
				"sebetaColumn": "SE",
				"afColumn": "AF",
				"pval_threshold": 0.05,
				"delimiter": "\t"
			}`,
		},
		{
			name: "missing pval_threshold",
			json: `{
				"tag": "test",
				"chromosomeColumn": "CHR",
				"positionColumn": "POS",
				"referenceColumn": "REF",
				"alternativeColumn": "ALT",
				"pValueColumn": "PVAL",
				"betaColumn": "BETA",
				"sebetaColumn": "SE",
				"afColumn": "AF",
				"delimiter": "\t"
			}`,
		},
	}

	logger := func(msg string) {}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseFileConfiguration([]byte(tt.json), logger)
			if err == nil {
				t.Errorf("Expected validation error for %s, got none", tt.name)
			}
		})
	}
}

func TestParseFileConfiguration_EmptyJSON(t *testing.T) {
	emptyJSON := []byte(`{}`)

	logger := func(msg string) {}

	_, err := ParseFileConfiguration(emptyJSON, logger)

	if err == nil {
		t.Fatal("Expected validation error for empty JSON, got none")
	}
}

func TestParseFileConfiguration_AllFieldTypes(t *testing.T) {
	validJSON := []byte(`{
		"tag": "complete_config",
		"chromosomeColumn": "CHROM",
		"positionColumn": "BP",
		"referenceColumn": "A1",
		"alternativeColumn": "A2",
		"pValueColumn": "P",
		"betaColumn": "EFFECT",
		"sebetaColumn": "STDERR",
		"afColumn": "FREQ",
		"pval_threshold": 1e-8,
		"delimiter": ","
	}`)

	logger := func(msg string) {}

	config, err := ParseFileConfiguration(validJSON, logger)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	// Verify all fields are correctly parsed
	expectedFields := map[string]string{
		"tag":               "complete_config",
		"column_chromosome": "CHROM",
		"column_position":   "BP",
		"column_reference":  "A1",
		"column_alternate":  "A2",
		"column_pvalue":     "P",
		"column_beta":       "EFFECT",
		"column_sebeta":     "STDERR",
		"column_af":         "FREQ",
	}

	actualFields := map[string]string{
		"tag":               config.Tag,
		"column_chromosome": config.ColumnChromosome,
		"column_position":   config.ColumnPosition,
		"column_reference":  config.ColumnReference,
		"column_alternate":  config.ColumnAlternate,
		"column_pvalue":     config.ColumnPValue,
		"column_beta":       config.ColumnBeta,
		"column_sebeta":     config.ColumnSEBeta,
		"column_af":         config.ColumnAlleleFrequency,
	}

	for field, expected := range expectedFields {
		if actual := actualFields[field]; actual != expected {
			t.Errorf("Field %s: expected '%s', got '%s'", field, expected, actual)
		}
	}

	if config.PvalThreshold != 1e-8 {
		t.Errorf("Expected pval_threshold 1e-8, got %f", config.PvalThreshold)
	}
}

func TestCreateFileColumnsIndex_ValidHeader(t *testing.T) {
	header := []byte("CHR\tPOS\tREF\tALT\tPVAL\tBETA\tSE\tAF")
	config := FileConfiguration{
		Tag: "test",
		FileColumnsDefinition: FileColumnsDefinition{
			ColumnChromosome:      "CHR",
			ColumnPosition:        "POS",
			ColumnReference:       "REF",
			ColumnAlternate:       "ALT",
			ColumnPValue:          "PVAL",
			ColumnBeta:            "BETA",
			ColumnSEBeta:          "SE",
			ColumnAlleleFrequency: "AF",
		},
		PvalThreshold: 0.05,
		Delimiter:     "\t",
	}

	metadata, err := CreateFileColumnsIndex(header, config)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if metadata.Tag != "test" {
		t.Errorf("Expected tag 'test', got '%s'", metadata.Tag)
	}

	if metadata.ColumnChromosome != 0 {
		t.Errorf("Expected ColumnChromosome index 0, got %d", metadata.ColumnChromosome)
	}

	if metadata.ColumnPosition != 1 {
		t.Errorf("Expected ColumnPosition index 1, got %d", metadata.ColumnPosition)
	}

	if metadata.ColumnReference != 2 {
		t.Errorf("Expected ColumnReference index 2, got %d", metadata.ColumnReference)
	}

	if metadata.ColumnAlternate != 3 {
		t.Errorf("Expected ColumnAlternate index 3, got %d", metadata.ColumnAlternate)
	}

	if metadata.ColumnPValue != 4 {
		t.Errorf("Expected ColumnPValue index 4, got %d", metadata.ColumnPValue)
	}

	if metadata.ColumnBeta != 5 {
		t.Errorf("Expected ColumnBeta index 5, got %d", metadata.ColumnBeta)
	}

	if metadata.ColumnSEBeta != 6 {
		t.Errorf("Expected ColumnSEBeta index 6, got %d", metadata.ColumnSEBeta)
	}

	if metadata.ColumnAlleleFrequency != 7 {
		t.Errorf("Expected ColumnAlleleFrequency index 7, got %d", metadata.ColumnAlleleFrequency)
	}

	if metadata.PvalThreshold != 0.05 {
		t.Errorf("Expected PvalThreshold 0.05, got %f", metadata.PvalThreshold)
	}

	if metadata.Delimiter != "\t" {
		t.Errorf("Expected Delimiter '\\t', got '%s'", metadata.Delimiter)
	}
}

func TestCreateFileColumnsIndex_MissingColumn(t *testing.T) {
	tests := []struct {
		name   string
		header string
		config FileConfiguration
	}{
		{
			name:   "missing chromosome column",
			header: "POS\tREF\tALT\tPVAL\tBETA\tSE\tAF",
			config: FileConfiguration{
				Tag: "test",
				FileColumnsDefinition: FileColumnsDefinition{
					ColumnChromosome:      "CHR",
					ColumnPosition:        "POS",
					ColumnReference:       "REF",
					ColumnAlternate:       "ALT",
					ColumnPValue:          "PVAL",
					ColumnBeta:            "BETA",
					ColumnSEBeta:          "SE",
					ColumnAlleleFrequency: "AF",
				},
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
		},
		{
			name:   "missing pvalue column",
			header: "CHR\tPOS\tREF\tALT\tBETA\tSE\tAF",
			config: FileConfiguration{
				Tag: "test",
				FileColumnsDefinition: FileColumnsDefinition{
					ColumnChromosome:      "CHR",
					ColumnPosition:        "POS",
					ColumnReference:       "REF",
					ColumnAlternate:       "ALT",
					ColumnPValue:          "PVAL",
					ColumnBeta:            "BETA",
					ColumnSEBeta:          "SE",
					ColumnAlleleFrequency: "AF",
				},
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := CreateFileColumnsIndex([]byte(tt.header), tt.config)
			if err == nil {
				t.Errorf("Expected error for %s, got none", tt.name)
			}
		})
	}
}

func TestCreateFileColumnsIndex_DifferentDelimiter(t *testing.T) {
	header := []byte("CHR,POS,REF,ALT,PVAL,BETA,SE,AF")
	config := FileConfiguration{
		Tag: "test",
		FileColumnsDefinition: FileColumnsDefinition{
			ColumnChromosome:      "CHR",
			ColumnPosition:        "POS",
			ColumnReference:       "REF",
			ColumnAlternate:       "ALT",
			ColumnPValue:          "PVAL",
			ColumnBeta:            "BETA",
			ColumnSEBeta:          "SE",
			ColumnAlleleFrequency: "AF",
		},
		PvalThreshold: 0.05,
		Delimiter:     ",",
	}

	metadata, err := CreateFileColumnsIndex(header, config)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if metadata.Delimiter != "," {
		t.Errorf("Expected Delimiter ',', got '%s'", metadata.Delimiter)
	}

	// Verify indices are correct
	if metadata.ColumnChromosome != 0 || metadata.ColumnPosition != 1 {
		t.Error("Column indices not correctly parsed with comma delimiter")
	}
}

func TestCreateFileColumnsIndex_HeaderWithWhitespace(t *testing.T) {
	header := []byte(" CHR \t POS \t REF \t ALT \t PVAL \t BETA \t SE \t AF ")
	config := FileConfiguration{
		Tag: "test",
		FileColumnsDefinition: FileColumnsDefinition{
			ColumnChromosome:      "CHR",
			ColumnPosition:        "POS",
			ColumnReference:       "REF",
			ColumnAlternate:       "ALT",
			ColumnPValue:          "PVAL",
			ColumnBeta:            "BETA",
			ColumnSEBeta:          "SE",
			ColumnAlleleFrequency: "AF",
		},
		PvalThreshold: 0.05,
		Delimiter:     "\t",
	}

	metadata, err := CreateFileColumnsIndex(header, config)

	if err != nil {
		t.Fatalf("Expected no error with whitespace in header, got: %v", err)
	}

	// Should trim whitespace and find all columns
	if metadata.ColumnChromosome != 0 {
		t.Errorf("Expected ColumnChromosome index 0, got %d", metadata.ColumnChromosome)
	}
}
