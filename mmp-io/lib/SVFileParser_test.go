package lib

import (
	"testing"
)

func TestParseChromosome(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected uint32
		wantErr  bool
	}{
		{"numeric chromosome 1", "1", 1, false},
		{"numeric chromosome 22", "22", 22, false},
		{"chromosome X", "X", 23, false},
		{"chromosome x lowercase", "x", 23, false},
		{"chromosome Y", "Y", 24, false},
		{"chromosome y lowercase", "y", 24, false},
		{"chromosome MT", "MT", 25, false},
		{"chromosome M", "M", 25, false},
		{"chromosome MITO", "MITO", 25, false},
		{"chromosome MITOCHONDRIAL", "MITOCHONDRIAL", 25, false},
		{"chromosome with whitespace", " 5 ", 5, false},
		{"invalid chromosome", "invalid", 0, true},
		{"empty string", "", 0, true},
		{"negative number", "-1", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseChromosome(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Errorf("parseChromosome(%q) expected error, got none", tt.input)
				}
			} else {
				if err != nil {
					t.Errorf("parseChromosome(%q) unexpected error: %v", tt.input, err)
				}
				if result != tt.expected {
					t.Errorf("parseChromosome(%q) = %d, want %d", tt.input, result, tt.expected)
				}
			}
		})
	}
}

func TestParseUint32(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected uint32
		wantErr  bool
	}{
		{"zero", "0", 0, false},
		{"small number", "42", 42, false},
		{"large number", "4294967295", 4294967295, false},
		{"overflow", "4294967296", 0, true},
		{"negative", "-1", 0, true},
		{"decimal", "3.14", 0, true},
		{"text", "abc", 0, true},
		{"empty", "", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseUint32(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Errorf("parseUint32(%q) expected error, got none", tt.input)
				}
			} else {
				if err != nil {
					t.Errorf("parseUint32(%q) unexpected error: %v", tt.input, err)
				}
				if result != tt.expected {
					t.Errorf("parseUint32(%q) = %d, want %d", tt.input, result, tt.expected)
				}
			}
		})
	}
}

func TestParseUint64(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected uint64
		wantErr  bool
	}{
		{"zero", "0", 0, false},
		{"small number", "123", 123, false},
		{"large number", "18446744073709551615", 18446744073709551615, false},
		{"overflow", "18446744073709551616", 0, true},
		{"negative", "-1", 0, true},
		{"decimal", "123.456", 0, true},
		{"text", "xyz", 0, true},
		{"empty", "", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseUint64(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Errorf("parseUint64(%q) expected error, got none", tt.input)
				}
			} else {
				if err != nil {
					t.Errorf("parseUint64(%q) unexpected error: %v", tt.input, err)
				}
				if result != tt.expected {
					t.Errorf("parseUint64(%q) = %d, want %d", tt.input, result, tt.expected)
				}
			}
		})
	}
}

func TestParseFloat32(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected float32
		wantErr  bool
	}{
		{"zero", "0", 0.0, false},
		{"integer", "42", 42.0, false},
		{"decimal", "3.14", 3.14, false},
		{"scientific notation", "1e-8", 1e-8, false},
		{"negative", "-2.5", -2.5, false},
		{"very small", "0.000001", 0.000001, false},
		{"text", "abc", 0, true},
		{"empty", "", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseFloat32(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Errorf("parseFloat32(%q) expected error, got none", tt.input)
				}
			} else {
				if err != nil {
					t.Errorf("parseFloat32(%q) unexpected error: %v", tt.input, err)
				}
				if result != tt.expected {
					t.Errorf("parseFloat32(%q) = %f, want %f", tt.input, result, tt.expected)
				}
			}
		})
	}
}

func TestParsePValue(t *testing.T) {
	indexHeader := FileColumnsIndex{
		ColumnChromosome:      0,
		ColumnPosition:        1,
		ColumnReference:       2,
		ColumnAlternate:       3,
		ColumnPValue:          4,
		ColumnBeta:            5,
		ColumnSEBeta:          6,
		ColumnAlleleFrequency: 7,
	}

	tests := []struct {
		name     string
		buffer   []string
		expected float32
		wantErr  bool
	}{
		{
			"valid pvalue",
			[]string{"1", "12345", "A", "T", "0.001", "0.5", "0.1", "0.3"},
			0.001,
			false,
		},
		{
			"scientific notation",
			[]string{"1", "12345", "A", "T", "1e-8", "0.5", "0.1", "0.3"},
			1e-8,
			false,
		},
		{
			"invalid pvalue text",
			[]string{"1", "12345", "A", "T", "invalid", "0.5", "0.1", "0.3"},
			0,
			true,
		},
		{
			"empty pvalue",
			[]string{"1", "12345", "A", "T", "", "0.5", "0.1", "0.3"},
			0,
			true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parsePValue(tt.buffer, indexHeader)
			if tt.wantErr {
				if err == nil {
					t.Errorf("parsePValue() expected error, got none")
				}
			} else {
				if err != nil {
					t.Errorf("parsePValue() unexpected error: %v", err)
				}
				if result != tt.expected {
					t.Errorf("parsePValue() = %f, want %f", result, tt.expected)
				}
			}
		})
	}
}

func TestParseVariant(t *testing.T) {
	indexHeader := FileColumnsIndex{
		ColumnChromosome:      0,
		ColumnPosition:        1,
		ColumnReference:       2,
		ColumnAlternate:       3,
		ColumnPValue:          4,
		ColumnBeta:            5,
		ColumnSEBeta:          6,
		ColumnAlleleFrequency: 7,
	}

	tests := []struct {
		name     string
		buffer   []string
		expected *Variant
		wantErr  bool
	}{
		{
			"valid variant",
			[]string{"1", "12345", "A", "T", "0.001", "0.5", "0.1", "0.3"},
			&Variant{Chromosome: 1, Position: 12345, Ref: "A", Alt: "T"},
			false,
		},
		{
			"chromosome X",
			[]string{"X", "98765", "G", "C", "0.01", "0.2", "0.05", "0.4"},
			&Variant{Chromosome: 23, Position: 98765, Ref: "G", Alt: "C"},
			false,
		},
		{
			"chromosome Y",
			[]string{"Y", "54321", "C", "G", "0.05", "0.3", "0.1", "0.5"},
			&Variant{Chromosome: 24, Position: 54321, Ref: "C", Alt: "G"},
			false,
		},
		{
			"invalid chromosome",
			[]string{"invalid", "12345", "A", "T", "0.001", "0.5", "0.1", "0.3"},
			nil,
			true,
		},
		{
			"invalid position",
			[]string{"1", "not_a_number", "A", "T", "0.001", "0.5", "0.1", "0.3"},
			nil,
			true,
		},
		{
			"empty position",
			[]string{"1", "", "A", "T", "0.001", "0.5", "0.1", "0.3"},
			nil,
			true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseVariant(tt.buffer, indexHeader)
			if tt.wantErr {
				if err == nil {
					t.Errorf("parseVariant() expected error, got none")
				}
			} else {
				if err != nil {
					t.Errorf("parseVariant() unexpected error: %v", err)
				}
				if result.Chromosome != tt.expected.Chromosome {
					t.Errorf("parseVariant().Chromosome = %d, want %d", result.Chromosome, tt.expected.Chromosome)
				}
				if result.Position != tt.expected.Position {
					t.Errorf("parseVariant().Position = %d, want %d", result.Position, tt.expected.Position)
				}
				if result.Ref != tt.expected.Ref {
					t.Errorf("parseVariant().Ref = %s, want %s", result.Ref, tt.expected.Ref)
				}
				if result.Alt != tt.expected.Alt {
					t.Errorf("parseVariant().Alt = %s, want %s", result.Alt, tt.expected.Alt)
				}
			}
		})
	}
}

func TestVariantKey(t *testing.T) {
	tests := []struct {
		name      string
		variant   *Variant
		delimiter string
		expected  string
	}{
		{
			"tab delimiter",
			&Variant{Chromosome: 1, Position: 12345, Ref: "A", Alt: "T"},
			"\t",
			"1\t12345\tA\tT",
		},
		{
			"comma delimiter",
			&Variant{Chromosome: 23, Position: 98765, Ref: "G", Alt: "C"},
			",",
			"23,98765,G,C",
		},
		{
			"chromosome Y",
			&Variant{Chromosome: 24, Position: 54321, Ref: "C", Alt: "G"},
			"\t",
			"24\t54321\tC\tG",
		},
		{
			"mitochondrial",
			&Variant{Chromosome: 25, Position: 100, Ref: "T", Alt: "A"},
			"\t",
			"25\t100\tT\tA",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := variantKey(tt.variant, tt.delimiter)
			if result != tt.expected {
				t.Errorf("variantKey() = %q, want %q", result, tt.expected)
			}
		})
	}
}

func TestBufferVariants(t *testing.T) {
	metadata := BlockMetadata{
		Tag: "test",
		FileColumnsIndex: FileColumnsIndex{
			ColumnChromosome:      0,
			ColumnPosition:        1,
			ColumnReference:       2,
			ColumnAlternate:       3,
			ColumnPValue:          4,
			ColumnBeta:            5,
			ColumnSEBeta:          6,
			ColumnAlleleFrequency: 7,
		},
		PvalThreshold: 0.01,
		Delimiter:     "\t",
	}

	tests := []struct {
		name     string
		buffer   []byte
		metadata BlockMetadata
		expected []string
		wantErr  bool
	}{
		{
			"single variant below threshold",
			[]byte("1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n"),
			metadata,
			[]string{"1\t12345\tA\tT"},
			false,
		},
		{
			"multiple variants below threshold",
			[]byte("1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n2\t67890\tG\tC\t0.005\t0.2\t0.05\t0.4\n"),
			metadata,
			[]string{"1\t12345\tA\tT", "2\t67890\tG\tC"},
			false,
		},
		{
			"variant above threshold excluded",
			[]byte("1\t12345\tA\tT\t0.05\t0.5\t0.1\t0.3\n"),
			metadata,
			[]string{},
			false,
		},
		{
			"mixed variants some above threshold",
			[]byte("1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n2\t67890\tG\tC\t0.5\t0.2\t0.05\t0.4\n3\t11111\tC\tG\t0.008\t0.3\t0.1\t0.2\n"),
			metadata,
			[]string{"1\t12345\tA\tT", "3\t11111\tC\tG"},
			false,
		},
		{
			"chromosome X variant",
			[]byte("X\t98765\tG\tC\t0.002\t0.2\t0.05\t0.4\n"),
			metadata,
			[]string{"23\t98765\tG\tC"},
			false,
		},
		{
			"empty buffer",
			[]byte(""),
			metadata,
			[]string{},
			false,
		},
		{
			"invalid chromosome",
			[]byte("invalid\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n"),
			metadata,
			nil,
			true,
		},
		{
			"invalid position",
			[]byte("1\tinvalid\tA\tT\t0.001\t0.5\t0.1\t0.3\n"),
			metadata,
			nil,
			true,
		},
		{
			"invalid pvalue",
			[]byte("1\t12345\tA\tT\tinvalid\t0.5\t0.1\t0.3\n"),
			metadata,
			nil,
			true,
		},
		{
			"missing fields returns error",
			[]byte("1\t12345\tA\n"),
			metadata,
			nil,
			true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := BufferVariants(tt.buffer, tt.metadata)
			if tt.wantErr {
				if err == nil {
					t.Errorf("BufferVariants() expected error, got none")
				}
			} else {
				if err != nil {
					t.Errorf("BufferVariants() unexpected error: %v", err)
				}
				if len(result) != len(tt.expected) {
					t.Errorf("BufferVariants() returned %d variants, want %d", len(result), len(tt.expected))
				}
				for i, variant := range result {
					if i < len(tt.expected) && variant != tt.expected[i] {
						t.Errorf("BufferVariants()[%d] = %q, want %q", i, variant, tt.expected[i])
					}
				}
			}
		})
	}
}

func TestBufferVariantsCommaDelimiter(t *testing.T) {
	metadata := BlockMetadata{
		Tag: "test-csv",
		FileColumnsIndex: FileColumnsIndex{
			ColumnChromosome:      0,
			ColumnPosition:        1,
			ColumnReference:       2,
			ColumnAlternate:       3,
			ColumnPValue:          4,
			ColumnBeta:            5,
			ColumnSEBeta:          6,
			ColumnAlleleFrequency: 7,
		},
		PvalThreshold: 0.05,
		Delimiter:     ",",
	}

	buffer := []byte("1,12345,A,T,0.001,0.5,0.1,0.3\n2,67890,G,C,0.01,0.2,0.05,0.4\n")
	expected := []string{"1,12345,A,T", "2,67890,G,C"}

	result, err := BufferVariants(buffer, metadata)
	if err != nil {
		t.Fatalf("BufferVariants() unexpected error: %v", err)
	}

	if len(result) != len(expected) {
		t.Errorf("BufferVariants() returned %d variants, want %d", len(result), len(expected))
	}

	for i, variant := range result {
		if i < len(expected) && variant != expected[i] {
			t.Errorf("BufferVariants()[%d] = %q, want %q", i, variant, expected[i])
		}
	}
}
