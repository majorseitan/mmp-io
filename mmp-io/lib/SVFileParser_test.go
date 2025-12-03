package lib

import (
	"strings"
	"testing"

	"google.golang.org/protobuf/proto"
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

func TestParseAssociationStatistic(t *testing.T) {
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
		expected *AssociationStatistic
		wantErr  bool
		errMsg   string
	}{
		{
			name:   "valid association statistic",
			buffer: []string{"1", "12345", "A", "T", "0.001", "0.5", "0.1", "0.3"},
			expected: &AssociationStatistic{
				PValue: 0.001,
				Beta:   0.5,
				Sebeta: 0.1,
				Af:     0.3,
			},
			wantErr: false,
		},
		{
			name:   "scientific notation pvalue",
			buffer: []string{"1", "12345", "A", "T", "1.5e-8", "0.25", "0.05", "0.45"},
			expected: &AssociationStatistic{
				PValue: 1.5e-8,
				Beta:   0.25,
				Sebeta: 0.05,
				Af:     0.45,
			},
			wantErr: false,
		},
		{
			name:    "invalid pvalue",
			buffer:  []string{"1", "12345", "A", "T", "INVALID", "0.5", "0.1", "0.3"},
			wantErr: true,
			errMsg:  "invalid pvalue",
		},
		{
			name:    "invalid beta",
			buffer:  []string{"1", "12345", "A", "T", "0.001", "INVALID", "0.1", "0.3"},
			wantErr: true,
			errMsg:  "invalid beta",
		},
		{
			name:    "invalid sebeta",
			buffer:  []string{"1", "12345", "A", "T", "0.001", "0.5", "INVALID", "0.3"},
			wantErr: true,
			errMsg:  "invalid sebeta",
		},
		{
			name:    "invalid allele frequency",
			buffer:  []string{"1", "12345", "A", "T", "0.001", "0.5", "0.1", "INVALID"},
			wantErr: true,
			errMsg:  "invalid allele frequency",
		},
		{
			name:   "negative beta",
			buffer: []string{"1", "12345", "A", "T", "0.005", "-0.3", "0.08", "0.2"},
			expected: &AssociationStatistic{
				PValue: 0.005,
				Beta:   -0.3,
				Sebeta: 0.08,
				Af:     0.2,
			},
			wantErr: false,
		},
		{
			name:   "zero values",
			buffer: []string{"1", "12345", "A", "T", "0", "0", "0", "0"},
			expected: &AssociationStatistic{
				PValue: 0,
				Beta:   0,
				Sebeta: 0,
				Af:     0,
			},
			wantErr: false,
		},
		{
			name:   "boundary values",
			buffer: []string{"1", "12345", "A", "T", "1.0", "1.0", "1.0", "1.0"},
			expected: &AssociationStatistic{
				PValue: 1.0,
				Beta:   1.0,
				Sebeta: 1.0,
				Af:     1.0,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseAssociationStatistic(tt.buffer, indexHeader)
			if tt.wantErr {
				if err == nil {
					t.Errorf("parseAssociationStatistic() expected error containing %q, got none", tt.errMsg)
				} else if tt.errMsg != "" && !contains(err.Error(), tt.errMsg) {
					t.Errorf("parseAssociationStatistic() error = %q, want error containing %q", err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("parseAssociationStatistic() unexpected error: %v", err)
				} else {
					if result.PValue != tt.expected.PValue {
						t.Errorf("parseAssociationStatistic() PValue = %f, want %f", result.PValue, tt.expected.PValue)
					}
					if result.Beta != tt.expected.Beta {
						t.Errorf("parseAssociationStatistic() Beta = %f, want %f", result.Beta, tt.expected.Beta)
					}
					if result.Sebeta != tt.expected.Sebeta {
						t.Errorf("parseAssociationStatistic() Sebeta = %f, want %f", result.Sebeta, tt.expected.Sebeta)
					}
					if result.Af != tt.expected.Af {
						t.Errorf("parseAssociationStatistic() Af = %f, want %f", result.Af, tt.expected.Af)
					}
				}
			}
		})
	}
}

func TestSerializeAssociationStatistic(t *testing.T) {
	tests := []struct {
		name     string
		assoc    *AssociationStatistic
		expected []string
	}{
		{
			name: "standard values",
			assoc: &AssociationStatistic{
				PValue: 0.001,
				Beta:   0.5,
				Sebeta: 0.1,
				Af:     0.3,
			},
			expected: []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"},
		},
		{
			name: "scientific notation pvalue",
			assoc: &AssociationStatistic{
				PValue: 1.5e-8,
				Beta:   0.25,
				Sebeta: 0.05,
				Af:     0.45,
			},
			expected: []string{"1.500000e-08", "0.250000", "0.050000", "0.450000"},
		},
		{
			name: "negative beta",
			assoc: &AssociationStatistic{
				PValue: 0.005,
				Beta:   -0.3,
				Sebeta: 0.08,
				Af:     0.2,
			},
			expected: []string{"5.000000e-03", "-0.300000", "0.080000", "0.200000"},
		},
		{
			name: "zero values",
			assoc: &AssociationStatistic{
				PValue: 0,
				Beta:   0,
				Sebeta: 0,
				Af:     0,
			},
			expected: []string{"0.000000e+00", "0.000000", "0.000000", "0.000000"},
		},
		{
			name: "large pvalue",
			assoc: &AssociationStatistic{
				PValue: 0.99999,
				Beta:   1.5,
				Sebeta: 0.5,
				Af:     0.75,
			},
			expected: []string{"9.999900e-01", "1.500000", "0.500000", "0.750000"},
		},
		{
			name: "very small pvalue",
			assoc: &AssociationStatistic{
				PValue: 1e-30,
				Beta:   0.1,
				Sebeta: 0.01,
				Af:     0.05,
			},
			expected: []string{"1.000000e-30", "0.100000", "0.010000", "0.050000"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := serializeAssociationStatistic(tt.assoc)
			if len(result) != 4 {
				t.Errorf("serializeAssociationStatistic() returned %d values, want 4", len(result))
				return
			}
			for i := 0; i < 4; i++ {
				if result[i] != tt.expected[i] {
					t.Errorf("serializeAssociationStatistic()[%d] = %q, want %q", i, result[i], tt.expected[i])
				}
			}
		})
	}
}

func TestMarshalSummaryRows(t *testing.T) {
	tests := []struct {
		name     string
		input    []SummaryRows
		wantErr  bool
		validate func(t *testing.T, result [][]byte)
	}{
		{
			name: "single partition with one variant",
			input: []SummaryRows{
				{
					Rows: map[string]*SummaryValues{
						"1\t12345\tA\tT": {
							Values: []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"},
						},
					},
				},
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 1 {
					t.Errorf("expected 1 partition, got %d", len(result))
					return
				}
				var summaryRows SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows); err != nil {
					t.Fatalf("failed to unmarshal: %v", err)
				}
				if len(summaryRows.Rows) != 1 {
					t.Errorf("expected 1 variant, got %d", len(summaryRows.Rows))
				}
				val, ok := summaryRows.Rows["1\t12345\tA\tT"]
				if !ok {
					t.Error("variant key not found")
					return
				}
				if len(val.Values) != 4 {
					t.Errorf("expected 4 values, got %d", len(val.Values))
				}
			},
		},
		{
			name: "multiple partitions",
			input: []SummaryRows{
				{
					Rows: map[string]*SummaryValues{
						"1\t12345\tA\tT": {
							Values: []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"},
						},
					},
				},
				{
					Rows: map[string]*SummaryValues{
						"2\t67890\tG\tC": {
							Values: []string{"5.000000e-03", "0.250000", "0.050000", "0.400000"},
						},
						"3\t11111\tC\tG": {
							Values: []string{"1.500000e-08", "0.350000", "0.080000", "0.500000"},
						},
					},
				},
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 2 {
					t.Errorf("expected 2 partitions, got %d", len(result))
					return
				}
				// Check first partition
				var summaryRows1 SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows1); err != nil {
					t.Fatalf("failed to unmarshal partition 0: %v", err)
				}
				if len(summaryRows1.Rows) != 1 {
					t.Errorf("partition 0: expected 1 variant, got %d", len(summaryRows1.Rows))
				}
				// Check second partition
				var summaryRows2 SummaryRows
				if err := proto.Unmarshal(result[1], &summaryRows2); err != nil {
					t.Fatalf("failed to unmarshal partition 1: %v", err)
				}
				if len(summaryRows2.Rows) != 2 {
					t.Errorf("partition 1: expected 2 variants, got %d", len(summaryRows2.Rows))
				}
			},
		},
		{
			name: "empty partition",
			input: []SummaryRows{
				{
					Rows: map[string]*SummaryValues{},
				},
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 1 {
					t.Errorf("expected 1 partition, got %d", len(result))
					return
				}
				var summaryRows SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows); err != nil {
					t.Fatalf("failed to unmarshal: %v", err)
				}
				if len(summaryRows.Rows) != 0 {
					t.Errorf("expected 0 variants, got %d", len(summaryRows.Rows))
				}
			},
		},
		{
			name:    "no partitions",
			input:   []SummaryRows{},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 0 {
					t.Errorf("expected 0 partitions, got %d", len(result))
				}
			},
		},
		{
			name: "multiple variants in single partition",
			input: []SummaryRows{
				{
					Rows: map[string]*SummaryValues{
						"1\t12345\tA\tT": {
							Values: []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"},
						},
						"2\t67890\tG\tC": {
							Values: []string{"5.000000e-03", "0.250000", "0.050000", "0.400000"},
						},
						"X\t99999\tT\tA": {
							Values: []string{"1.000000e-05", "0.100000", "0.020000", "0.150000"},
						},
					},
				},
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 1 {
					t.Errorf("expected 1 partition, got %d", len(result))
					return
				}
				var summaryRows SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows); err != nil {
					t.Fatalf("failed to unmarshal: %v", err)
				}
				if len(summaryRows.Rows) != 3 {
					t.Errorf("expected 3 variants, got %d", len(summaryRows.Rows))
				}
				// Verify all keys exist
				keys := []string{"1\t12345\tA\tT", "2\t67890\tG\tC", "X\t99999\tT\tA"}
				for _, key := range keys {
					if _, ok := summaryRows.Rows[key]; !ok {
						t.Errorf("variant key %q not found", key)
					}
				}
			},
		},
		{
			name: "verify values are preserved",
			input: []SummaryRows{
				{
					Rows: map[string]*SummaryValues{
						"1\t12345\tA\tT": {
							Values: []string{"1.500000e-08", "-0.300000", "0.080000", "0.200000"},
						},
					},
				},
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 1 {
					t.Errorf("expected 1 partition, got %d", len(result))
					return
				}
				var summaryRows SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows); err != nil {
					t.Fatalf("failed to unmarshal: %v", err)
				}
				val, ok := summaryRows.Rows["1\t12345\tA\tT"]
				if !ok {
					t.Fatal("variant key not found")
				}
				expected := []string{"1.500000e-08", "-0.300000", "0.080000", "0.200000"}
				if len(val.Values) != len(expected) {
					t.Errorf("expected %d values, got %d", len(expected), len(val.Values))
					return
				}
				for i, exp := range expected {
					if val.Values[i] != exp {
						t.Errorf("value[%d] = %q, want %q", i, val.Values[i], exp)
					}
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := marshalSummaryRows(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Error("marshalSummaryRows() expected error, got none")
				}
			} else {
				if err != nil {
					t.Errorf("marshalSummaryRows() unexpected error: %v", err)
				} else if tt.validate != nil {
					tt.validate(t, result)
				}
			}
		})
	}
}

func TestUnmarshalSummaryRows(t *testing.T) {
	tests := []struct {
		name     string
		setup    func() [][]byte
		wantErr  bool
		validate func(t *testing.T, result []*SummaryRows)
	}{
		{
			name: "single partition with one variant",
			setup: func() [][]byte {
				summaryRows := SummaryRows{
					Rows: map[string]*SummaryValues{
						"1\t12345\tA\tT": {
							Values: []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"},
						},
					},
				}
				data, _ := proto.Marshal(&summaryRows)
				return [][]byte{data}
			},
			wantErr: false,
			validate: func(t *testing.T, result []*SummaryRows) {
				if len(result) != 1 {
					t.Fatalf("expected 1 partition, got %d", len(result))
				}
				if len(result[0].Rows) != 1 {
					t.Errorf("expected 1 variant, got %d", len(result[0].Rows))
				}
				val, ok := result[0].Rows["1\t12345\tA\tT"]
				if !ok {
					t.Fatal("variant key not found")
				}
				if len(val.Values) != 4 {
					t.Errorf("expected 4 values, got %d", len(val.Values))
				}
				expected := []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"}
				for i, exp := range expected {
					if val.Values[i] != exp {
						t.Errorf("value[%d] = %q, want %q", i, val.Values[i], exp)
					}
				}
			},
		},
		{
			name: "multiple partitions with multiple variants",
			setup: func() [][]byte {
				summaryRows1 := SummaryRows{
					Rows: map[string]*SummaryValues{
						"1\t12345\tA\tT": {
							Values: []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"},
						},
						"2\t67890\tG\tC": {
							Values: []string{"5.000000e-03", "0.250000", "0.050000", "0.400000"},
						},
					},
				}
				summaryRows2 := SummaryRows{
					Rows: map[string]*SummaryValues{
						"3\t11111\tC\tG": {
							Values: []string{"1.500000e-08", "0.350000", "0.080000", "0.500000"},
						},
					},
				}
				data1, _ := proto.Marshal(&summaryRows1)
				data2, _ := proto.Marshal(&summaryRows2)
				return [][]byte{data1, data2}
			},
			wantErr: false,
			validate: func(t *testing.T, result []*SummaryRows) {
				if len(result) != 2 {
					t.Fatalf("expected 2 partitions, got %d", len(result))
				}
				if len(result[0].Rows) != 2 {
					t.Errorf("partition 0: expected 2 variants, got %d", len(result[0].Rows))
				}
				if len(result[1].Rows) != 1 {
					t.Errorf("partition 1: expected 1 variant, got %d", len(result[1].Rows))
				}
			},
		},
		{
			name: "empty partition",
			setup: func() [][]byte {
				summaryRows := SummaryRows{
					Rows: map[string]*SummaryValues{},
				}
				data, _ := proto.Marshal(&summaryRows)
				return [][]byte{data}
			},
			wantErr: false,
			validate: func(t *testing.T, result []*SummaryRows) {
				if len(result) != 1 {
					t.Fatalf("expected 1 partition, got %d", len(result))
				}
				if len(result[0].Rows) != 0 {
					t.Errorf("expected 0 variants, got %d", len(result[0].Rows))
				}
			},
		},
		{
			name: "no partitions",
			setup: func() [][]byte {
				return [][]byte{}
			},
			wantErr: false,
			validate: func(t *testing.T, result []*SummaryRows) {
				if len(result) != 0 {
					t.Errorf("expected 0 partitions, got %d", len(result))
				}
			},
		},
		{
			name: "invalid protobuf data",
			setup: func() [][]byte {
				return [][]byte{[]byte("invalid protobuf data")}
			},
			wantErr: true,
			validate: func(t *testing.T, result []*SummaryRows) {
				// Should not reach here
			},
		},
		{
			name: "round trip marshal then unmarshal",
			setup: func() [][]byte {
				input := []SummaryRows{
					{
						Rows: map[string]*SummaryValues{
							"1\t12345\tA\tT": {
								Values: []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"},
							},
						},
					},
					{
						Rows: map[string]*SummaryValues{
							"X\t99999\tT\tA": {
								Values: []string{"1.000000e-05", "0.100000", "0.020000", "0.150000"},
							},
						},
					},
				}
				result, _ := marshalSummaryRows(input)
				return result
			},
			wantErr: false,
			validate: func(t *testing.T, result []*SummaryRows) {
				if len(result) != 2 {
					t.Fatalf("expected 2 partitions, got %d", len(result))
				}
				// Verify first partition
				val1, ok := result[0].Rows["1\t12345\tA\tT"]
				if !ok {
					t.Fatal("variant 1 not found")
				}
				expected1 := []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"}
				for i, exp := range expected1 {
					if val1.Values[i] != exp {
						t.Errorf("partition 0 value[%d] = %q, want %q", i, val1.Values[i], exp)
					}
				}
				// Verify second partition
				val2, ok := result[1].Rows["X\t99999\tT\tA"]
				if !ok {
					t.Fatal("variant 2 not found")
				}
				expected2 := []string{"1.000000e-05", "0.100000", "0.020000", "0.150000"}
				for i, exp := range expected2 {
					if val2.Values[i] != exp {
						t.Errorf("partition 1 value[%d] = %q, want %q", i, val2.Values[i], exp)
					}
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := tt.setup()
			result, err := unmarshalSummaryRows(input)
			if tt.wantErr {
				if err == nil {
					t.Error("unmarshalSummaryRows() expected error, got none")
				}
			} else {
				if err != nil {
					t.Errorf("unmarshalSummaryRows() unexpected error: %v", err)
				} else if tt.validate != nil {
					tt.validate(t, result)
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

func TestBufferSummaryPasses(t *testing.T) {
	tests := []struct {
		name       string
		buffer     []byte
		metadata   BlockMetadata
		partitions VariantPartitions
		wantErr    bool
		errMsg     string
		validate   func(t *testing.T, result [][]byte)
	}{
		{
			name: "single partition with matching variants",
			buffer: []byte("1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n" +
				"2\t67890\tG\tC\t0.01\t0.2\t0.05\t0.4\n"),
			metadata: BlockMetadata{
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
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
			partitions: [][]string{
				{"1\t12345\tA\tT", "2\t67890\tG\tC"},
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 1 {
					t.Errorf("expected 1 partition, got %d", len(result))
					return
				}
				// Unmarshal and verify
				var summaryRows SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows); err != nil {
					t.Fatalf("failed to unmarshal: %v", err)
				}
				// Check header is populated
				if len(summaryRows.Header) != 4 {
					t.Errorf("expected 4 header columns, got %d", len(summaryRows.Header))
				}
				expectedHeader := []string{"test_pval", "test_beta", "test_sebeta", "test_af"}
				for i, h := range expectedHeader {
					if i >= len(summaryRows.Header) || summaryRows.Header[i] != h {
						t.Errorf("header[%d] = %q, want %q", i, summaryRows.Header[i], h)
					}
				}
				if len(summaryRows.Rows) != 2 {
					t.Errorf("expected 2 variants in partition, got %d", len(summaryRows.Rows))
				}
				// Check first variant
				if val, ok := summaryRows.Rows["1\t12345\tA\tT"]; ok {
					if len(val.Values) != 4 {
						t.Errorf("expected 4 values for variant, got %d", len(val.Values))
					}
				} else {
					t.Error("variant 1\t12345\tA\tT not found")
				}
			},
		},
		{
			name: "multiple partitions",
			buffer: []byte("1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n" +
				"2\t67890\tG\tC\t0.01\t0.2\t0.05\t0.4\n" +
				"3\t11111\tC\tG\t0.005\t0.3\t0.08\t0.5\n"),
			metadata: BlockMetadata{
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
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
			partitions: [][]string{
				{"1\t12345\tA\tT"},
				{"2\t67890\tG\tC", "3\t11111\tC\tG"},
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 2 {
					t.Errorf("expected 2 partitions, got %d", len(result))
					return
				}
				// Check first partition (1 variant)
				var summaryRows1 SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows1); err != nil {
					t.Fatalf("failed to unmarshal partition 0: %v", err)
				}
				// Check header is populated for first partition
				if len(summaryRows1.Header) != 4 {
					t.Errorf("partition 0: expected 4 header columns, got %d", len(summaryRows1.Header))
				}
				if len(summaryRows1.Rows) != 1 {
					t.Errorf("partition 0: expected 1 variant, got %d", len(summaryRows1.Rows))
				}
				// Check second partition (2 variants)
				var summaryRows2 SummaryRows
				if err := proto.Unmarshal(result[1], &summaryRows2); err != nil {
					t.Fatalf("failed to unmarshal partition 1: %v", err)
				}
				// Check header is populated for second partition
				if len(summaryRows2.Header) != 4 {
					t.Errorf("partition 1: expected 4 header columns, got %d", len(summaryRows2.Header))
				}
				if len(summaryRows2.Rows) != 2 {
					t.Errorf("partition 1: expected 2 variants, got %d", len(summaryRows2.Rows))
				}
			},
		},
		{
			name:   "missing variant in partition (should succeed with partial data)",
			buffer: []byte("1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n"),
			metadata: BlockMetadata{
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
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
			partitions: [][]string{
				{"1\t12345\tA\tT", "2\t67890\tG\tC"},
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 1 {
					t.Errorf("expected 1 partition, got %d", len(result))
					return
				}
				var summaryRows SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows); err != nil {
					t.Fatalf("failed to unmarshal: %v", err)
				}
				// Check header is populated even with missing variant
				if len(summaryRows.Header) != 4 {
					t.Errorf("expected 4 header columns, got %d", len(summaryRows.Header))
				}
				// Only 1 variant should be in the result (the missing one is not an error)
				if len(summaryRows.Rows) != 1 {
					t.Errorf("expected 1 variant, got %d", len(summaryRows.Rows))
				}
			},
		},
		{
			name:   "empty partitions",
			buffer: []byte("1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n"),
			metadata: BlockMetadata{
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
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
			partitions: [][]string{},
			wantErr:    false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 0 {
					t.Errorf("expected 0 partitions, got %d", len(result))
				}
			},
		},
		{
			name: "variant not in any partition (should be skipped)",
			buffer: []byte("1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n" +
				"2\t67890\tG\tC\t0.01\t0.2\t0.05\t0.4\n" +
				"3\t11111\tC\tG\t0.005\t0.3\t0.08\t0.5\n"),
			metadata: BlockMetadata{
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
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
			partitions: [][]string{
				{"1\t12345\tA\tT"},
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 1 {
					t.Errorf("expected 1 partition, got %d", len(result))
					return
				}
				var summaryRows SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows); err != nil {
					t.Fatalf("failed to unmarshal: %v", err)
				}
				// Check header is populated even when only 1 variant matches
				if len(summaryRows.Header) != 4 {
					t.Errorf("expected 4 header columns, got %d", len(summaryRows.Header))
				}
				if len(summaryRows.Rows) != 1 {
					t.Errorf("expected 1 variant, got %d", len(summaryRows.Rows))
				}
			},
		},
		{
			name: "partition with no matching variants - header still populated",
			buffer: []byte("1\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n" +
				"2\t67890\tG\tC\t0.01\t0.2\t0.05\t0.4\n"),
			metadata: BlockMetadata{
				Tag: "study1",
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
				Delimiter:     "\t",
			},
			partitions: [][]string{
				{"1\t12345\tA\tT"},
				{"3\t99999\tT\tA"}, // This variant is not in the buffer
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 2 {
					t.Errorf("expected 2 partitions, got %d", len(result))
					return
				}
				// Check first partition has data and header
				var summaryRows1 SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows1); err != nil {
					t.Fatalf("failed to unmarshal partition 0: %v", err)
				}
				if len(summaryRows1.Header) != 4 {
					t.Errorf("partition 0: expected 4 header columns, got %d", len(summaryRows1.Header))
				}
				if len(summaryRows1.Rows) != 1 {
					t.Errorf("partition 0: expected 1 variant, got %d", len(summaryRows1.Rows))
				}
				// Check second partition has header even with no matching variants
				var summaryRows2 SummaryRows
				if err := proto.Unmarshal(result[1], &summaryRows2); err != nil {
					t.Fatalf("failed to unmarshal partition 1: %v", err)
				}
				if len(summaryRows2.Header) != 4 {
					t.Errorf("partition 1: expected 4 header columns even with no variants, got %d", len(summaryRows2.Header))
				}
				expectedHeader := []string{"study1_pval", "study1_beta", "study1_sebeta", "study1_af"}
				for i, h := range expectedHeader {
					if i >= len(summaryRows2.Header) || summaryRows2.Header[i] != h {
						t.Errorf("partition 1 header[%d] = %q, want %q", i, summaryRows2.Header[i], h)
					}
				}
				if len(summaryRows2.Rows) != 0 {
					t.Errorf("partition 1: expected 0 variants, got %d", len(summaryRows2.Rows))
				}
			},
		},
		{
			name:   "insufficient columns",
			buffer: []byte("1\t12345\tA\n"),
			metadata: BlockMetadata{
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
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
			partitions: [][]string{
				{"1\t12345\tA\tT"},
			},
			wantErr: true,
			errMsg:  "insufficient columns",
		},
		{
			name:   "invalid chromosome",
			buffer: []byte("INVALID\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n"),
			metadata: BlockMetadata{
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
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
			partitions: [][]string{
				{"INVALID\t12345\tA\tT"},
			},
			wantErr: true,
			errMsg:  "invalid chromosome",
		},
		{
			name:   "invalid position",
			buffer: []byte("1\tINVALID\tA\tT\t0.001\t0.5\t0.1\t0.3\n"),
			metadata: BlockMetadata{
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
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
			partitions: [][]string{
				{"1\tINVALID\tA\tT"},
			},
			wantErr: true,
			errMsg:  "invalid position",
		},
		{
			name:   "invalid pvalue",
			buffer: []byte("1\t12345\tA\tT\tINVALID\t0.5\t0.1\t0.3\n"),
			metadata: BlockMetadata{
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
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
			partitions: [][]string{
				{"1\t12345\tA\tT"},
			},
			wantErr: true,
			errMsg:  "invalid pvalue",
		},
		{
			name:   "invalid beta",
			buffer: []byte("1\t12345\tA\tT\t0.001\tINVALID\t0.1\t0.3\n"),
			metadata: BlockMetadata{
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
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
			partitions: [][]string{
				{"1\t12345\tA\tT"},
			},
			wantErr: true,
			errMsg:  "invalid beta",
		},
		{
			name: "comma delimiter",
			buffer: []byte("1,12345,A,T,0.001,0.5,0.1,0.3\n" +
				"2,67890,G,C,0.01,0.2,0.05,0.4\n"),
			metadata: BlockMetadata{
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
			},
			partitions: [][]string{
				{"1,12345,A,T", "2,67890,G,C"},
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 1 {
					t.Errorf("expected 1 partition, got %d", len(result))
					return
				}
				var summaryRows SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows); err != nil {
					t.Fatalf("failed to unmarshal: %v", err)
				}
				if len(summaryRows.Rows) != 2 {
					t.Errorf("expected 2 variants, got %d", len(summaryRows.Rows))
				}
				// Verify keys use comma delimiter
				if _, ok := summaryRows.Rows["1,12345,A,T"]; !ok {
					t.Error("variant with key '1,12345,A,T' not found")
				}
			},
		},
		{
			name:   "chromosome X handling",
			buffer: []byte("X\t12345\tA\tT\t0.001\t0.5\t0.1\t0.3\n"),
			metadata: BlockMetadata{
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
				PvalThreshold: 0.05,
				Delimiter:     "\t",
			},
			partitions: [][]string{
				{"23\t12345\tA\tT"}, // X is parsed as 23
			},
			wantErr: false,
			validate: func(t *testing.T, result [][]byte) {
				if len(result) != 1 {
					t.Errorf("expected 1 partition, got %d", len(result))
					return
				}
				var summaryRows SummaryRows
				if err := proto.Unmarshal(result[0], &summaryRows); err != nil {
					t.Fatalf("failed to unmarshal: %v", err)
				}
				if len(summaryRows.Rows) != 1 {
					t.Errorf("expected 1 variant, got %d", len(summaryRows.Rows))
				}
				if _, ok := summaryRows.Rows["23\t12345\tA\tT"]; !ok {
					t.Error("variant with key '23\t12345\tA\tT' not found (X should be converted to 23)")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := BufferSummaryPasses(tt.buffer, tt.metadata, tt.partitions)
			if tt.wantErr {
				if err == nil {
					t.Errorf("BufferSummaryPasses() expected error containing %q, got none", tt.errMsg)
				} else if tt.errMsg != "" && !contains(err.Error(), tt.errMsg) {
					t.Errorf("BufferSummaryPasses() error = %q, want error containing %q", err.Error(), tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("BufferSummaryPasses() unexpected error: %v", err)
				} else if tt.validate != nil {
					tt.validate(t, result)
				}
			}
		})
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestSummaryBytesString(t *testing.T) {
	tests := []struct {
		name      string
		buffer    [][]byte
		delimiter string
		expected  map[string]string // Map variant key to expected concatenated values
		wantErr   bool
	}{
		{
			name: "single partition, single variant",
			buffer: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{"pval", "beta", "sebeta", "af"},
					Rows: map[string]*SummaryValues{
						"1\t12345\tA\tT": {Values: []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"}},
					},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			}(),
			delimiter: "\t",
			expected: map[string]string{
				"1\t12345\tA\tT": "1.000000e-03\t0.500000\t0.100000\t0.300000",
			},
			wantErr: false,
		},
		{
			name: "multiple partitions, single variant each",
			buffer: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"s1_pval", "s1_beta", "s1_sebeta", "s1_af"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5", "0.1", "0.3"}},
					},
				}
				rows2 := &SummaryRows{
					Header: []string{"s2_pval", "s2_beta", "s2_sebeta", "s2_af"},
					Rows: map[string]*SummaryValues{
						"1\t200\tG\tC": {Values: []string{"0.002", "0.6", "0.2", "0.4"}},
					},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				return [][]byte{data1, data2}
			}(),
			delimiter: "\t",
			expected: map[string]string{
				"1\t100\tA\tT": "0.001\t0.5\t0.1\t0.3\tNA\tNA\tNA\tNA",
				"1\t200\tG\tC": "NA\tNA\tNA\tNA\t0.002\t0.6\t0.2\t0.4",
			},
			wantErr: false,
		},
		{
			name: "multiple variants across multiple partitions",
			buffer: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"s1_pval", "s1_beta", "s1_sebeta", "s1_af"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5", "0.1", "0.3"}},
						"1\t200\tG\tC": {Values: []string{"0.002", "0.6", "0.2", "0.4"}},
					},
				}
				rows2 := &SummaryRows{
					Header: []string{"s2_pval", "s2_beta", "s2_sebeta", "s2_af"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.003", "0.7", "0.3", "0.5"}},
						"1\t200\tG\tC": {Values: []string{"0.004", "0.8", "0.4", "0.6"}},
					},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				return [][]byte{data1, data2}
			}(),
			delimiter: "\t",
			expected: map[string]string{
				"1\t100\tA\tT": "0.001\t0.5\t0.1\t0.3\t0.003\t0.7\t0.3\t0.5",
				"1\t200\tG\tC": "0.002\t0.6\t0.2\t0.4\t0.004\t0.8\t0.4\t0.6",
			},
			wantErr: false,
		},
		{
			name: "comma delimiter",
			buffer: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{"pval", "beta", "sebeta", "af"},
					Rows: map[string]*SummaryValues{
						"1,12345,A,T": {Values: []string{"0.001", "0.5", "0.1", "0.3"}},
					},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			}(),
			delimiter: ",",
			expected: map[string]string{
				"1,12345,A,T": "0.001,0.5,0.1,0.3",
			},
			wantErr: false,
		},
		{
			name: "empty partition with header",
			buffer: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{"pval", "beta"},
					Rows:   map[string]*SummaryValues{},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			}(),
			delimiter: "\t",
			expected:  map[string]string{},
			wantErr:   false,
		},
		{
			name: "partition without header - empty header",
			buffer: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5"}},
					},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			}(),
			delimiter: "\t",
			expected: map[string]string{
				"1\t100\tA\tT": "0.001\t0.5",
			},
			wantErr: false,
		},
		{
			name:      "invalid protobuf data",
			buffer:    [][]byte{[]byte("invalid protobuf data")},
			delimiter: "\t",
			expected:  nil,
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := SummaryBytesString(tt.buffer, tt.delimiter, false)
			if tt.wantErr {
				if err == nil {
					t.Errorf("SummaryBytesString() expected error, got none")
				}
				return
			}

			if err != nil {
				t.Errorf("SummaryBytesString() unexpected error: %v", err)
				return
			}

			if len(result) != len(tt.expected) {
				t.Errorf("SummaryBytesString() result length = %d, want %d", len(result), len(tt.expected))
				return
			}

			// Since variant order is non-deterministic (extracted from map),
			// verify all expected values are present in result
			resultSet := make(map[string]bool)
			for _, line := range result {
				resultSet[line] = true
			}

			for variant, expectedValue := range tt.expected {
				if !resultSet[expectedValue] {
					t.Errorf("SummaryBytesString() missing expected value for variant %q: %q", variant, expectedValue)
				}
			}

			// Verify no unexpected values
			expectedSet := make(map[string]bool)
			for _, expectedValue := range tt.expected {
				expectedSet[expectedValue] = true
			}

			for _, line := range result {
				if !expectedSet[line] {
					t.Errorf("SummaryBytesString() unexpected value in result: %q", line)
				}
			}
		})
	}
}

func TestCreateHeader(t *testing.T) {
	tests := []struct {
		name     string
		tag      string
		expected []string
	}{
		{
			name:     "standard tag",
			tag:      "finngen",
			expected: []string{"finngen_pval", "finngen_beta", "finngen_sebeta", "finngen_af"},
		},
		{
			name:     "empty tag",
			tag:      "",
			expected: []string{"_pval", "_beta", "_sebeta", "_af"},
		},
		{
			name:     "tag with special characters",
			tag:      "study-v2.1",
			expected: []string{"study-v2.1_pval", "study-v2.1_beta", "study-v2.1_sebeta", "study-v2.1_af"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CreateHeader(tt.tag)
			if len(result) != len(tt.expected) {
				t.Fatalf("CreateHeader() length = %d, want %d", len(result), len(tt.expected))
			}
			for i, exp := range tt.expected {
				if result[i] != exp {
					t.Errorf("CreateHeader()[%d] = %q, want %q", i, result[i], exp)
				}
			}
		})
	}
}

func TestHeaderBytesString(t *testing.T) {
	tests := []struct {
		name      string
		setup     func() [][]byte
		delimiter string
		expected  string
		wantErr   bool
	}{
		{
			name: "single partition with header",
			setup: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{"study1_pval", "study1_beta", "study1_sebeta", "study1_af"},
					Rows:   map[string]*SummaryValues{},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			},
			delimiter: "\t",
			expected:  "study1_pval\tstudy1_beta\tstudy1_sebeta\tstudy1_af",
			wantErr:   false,
		},
		{
			name: "multiple partitions with headers",
			setup: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"study1_pval", "study1_beta"},
					Rows:   map[string]*SummaryValues{},
				}
				rows2 := &SummaryRows{
					Header: []string{"study2_pval", "study2_beta"},
					Rows:   map[string]*SummaryValues{},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				return [][]byte{data1, data2}
			},
			delimiter: "\t",
			expected:  "study1_pval\tstudy1_beta\tstudy2_pval\tstudy2_beta",
			wantErr:   false,
		},
		{
			name: "comma delimiter",
			setup: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{"pval", "beta", "sebeta"},
					Rows:   map[string]*SummaryValues{},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			},
			delimiter: ",",
			expected:  "pval,beta,sebeta",
			wantErr:   false,
		},
		{
			name: "empty headers",
			setup: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{},
					Rows:   map[string]*SummaryValues{},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			},
			delimiter: "\t",
			expected:  "",
			wantErr:   false,
		},
		{
			name: "no partitions",
			setup: func() [][]byte {
				return [][]byte{}
			},
			delimiter: "\t",
			expected:  "",
			wantErr:   false,
		},
		{
			name: "invalid protobuf data",
			setup: func() [][]byte {
				return [][]byte{[]byte("invalid protobuf")}
			},
			delimiter: "\t",
			expected:  "",
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buffer := tt.setup()
			result, err := HeaderBytesString(buffer, tt.delimiter)
			if tt.wantErr {
				if err == nil {
					t.Error("HeaderBytesString() expected error, got none")
				}
				return
			}

			if err != nil {
				t.Errorf("HeaderBytesString() unexpected error: %v", err)
				return
			}

			if result != tt.expected {
				t.Errorf("HeaderBytesString() = %q, want %q", result, tt.expected)
			}
		})
	}
}

func TestSummaryBytesStringWithMissingValues(t *testing.T) {
	tests := []struct {
		name      string
		setup     func() [][]byte
		delimiter string
		validate  func(t *testing.T, result []string)
		wantErr   bool
	}{
		{
			name: "variant missing in second partition - fill with NA",
			setup: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"s1_pval", "s1_beta", "s1_sebeta", "s1_af"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5", "0.1", "0.3"}},
						"1\t200\tG\tC": {Values: []string{"0.002", "0.6", "0.2", "0.4"}},
					},
				}
				rows2 := &SummaryRows{
					Header: []string{"s2_pval", "s2_beta", "s2_sebeta", "s2_af"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.003", "0.7", "0.3", "0.5"}},
						// 1\t200\tG\tC is missing in partition 2
					},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				return [][]byte{data1, data2}
			},
			delimiter: "\t",
			validate: func(t *testing.T, result []string) {
				if len(result) != 2 {
					t.Fatalf("expected 2 variants, got %d", len(result))
				}
				// Find the result for variant "1\t200\tG\tC"
				var foundMissingVariant bool
				for _, line := range result {
					if strings.Contains(line, "0.002\t0.6\t0.2\t0.4\tNA\tNA\tNA\tNA") {
						foundMissingVariant = true
						break
					}
				}
				if !foundMissingVariant {
					t.Error("expected to find variant with NA values for missing partition")
				}
			},
			wantErr: false,
		},
		{
			name: "variant missing in first partition - fill with NA",
			setup: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"s1_pval", "s1_beta", "s1_sebeta", "s1_af"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5", "0.1", "0.3"}},
						// 1\t200\tG\tC is missing in partition 1
					},
				}
				rows2 := &SummaryRows{
					Header: []string{"s2_pval", "s2_beta", "s2_sebeta", "s2_af"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.003", "0.7", "0.3", "0.5"}},
						"1\t200\tG\tC": {Values: []string{"0.004", "0.8", "0.4", "0.6"}},
					},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				return [][]byte{data1, data2}
			},
			delimiter: "\t",
			validate: func(t *testing.T, result []string) {
				if len(result) != 2 {
					t.Fatalf("expected 2 variants, got %d", len(result))
				}
				// Find the result for variant "1\t200\tG\tC"
				var foundMissingVariant bool
				for _, line := range result {
					if strings.Contains(line, "NA\tNA\tNA\tNA\t0.004\t0.8\t0.4\t0.6") {
						foundMissingVariant = true
						break
					}
				}
				if !foundMissingVariant {
					t.Error("expected to find variant with NA values for missing partition")
				}
			},
			wantErr: false,
		},
		{
			name: "variant in some partitions but not all - multiple NAs",
			setup: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"s1_pval", "s1_beta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5"}},
					},
				}
				rows2 := &SummaryRows{
					Header: []string{"s2_pval", "s2_beta"},
					Rows:   map[string]*SummaryValues{
						// empty
					},
				}
				rows3 := &SummaryRows{
					Header: []string{"s3_pval", "s3_beta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.003", "0.7"}},
					},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				data3, _ := proto.Marshal(rows3)
				return [][]byte{data1, data2, data3}
			},
			delimiter: "\t",
			validate: func(t *testing.T, result []string) {
				if len(result) != 1 {
					t.Fatalf("expected 1 variant, got %d", len(result))
				}
				expected := "0.001\t0.5\tNA\tNA\t0.003\t0.7"
				if result[0] != expected {
					t.Errorf("result = %q, want %q", result[0], expected)
				}
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buffer := tt.setup()
			result, err := SummaryBytesString(buffer, tt.delimiter, false)
			if tt.wantErr {
				if err == nil {
					t.Error("SummaryBytesString() expected error, got none")
				}
				return
			}

			if err != nil {
				t.Errorf("SummaryBytesString() unexpected error: %v", err)
				return
			}

			if tt.validate != nil {
				tt.validate(t, result)
			}
		})
	}
}

func TestVariantCPRA(t *testing.T) {
	tests := []struct {
		name      string
		variant   string
		delimiter string
		expected  []string
	}{
		{
			name:      "tab delimiter",
			variant:   "1\t12345\tA\tT",
			delimiter: "\t",
			expected:  []string{"1", "12345", "A", "T"},
		},
		{
			name:      "comma delimiter",
			variant:   "23,98765,G,C",
			delimiter: ",",
			expected:  []string{"23", "98765", "G", "C"},
		},
		{
			name:      "chromosome X",
			variant:   "23\t100\tA\tT",
			delimiter: "\t",
			expected:  []string{"23", "100", "A", "T"},
		},
		{
			name:      "single character alleles",
			variant:   "1\t1000\tC\tG",
			delimiter: "\t",
			expected:  []string{"1", "1000", "C", "G"},
		},
		{
			name:      "multi-character insertion",
			variant:   "5\t2000\tA\tATCG",
			delimiter: "\t",
			expected:  []string{"5", "2000", "A", "ATCG"},
		},
		{
			name:      "multi-character deletion",
			variant:   "7\t3000\tGCTA\tG",
			delimiter: "\t",
			expected:  []string{"7", "3000", "GCTA", "G"},
		},
		{
			name:      "pipe delimiter",
			variant:   "12|5500|T|A",
			delimiter: "|",
			expected:  []string{"12", "5500", "T", "A"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := variantCPRA(tt.variant, tt.delimiter)
			if len(result) != len(tt.expected) {
				t.Fatalf("variantCPRA() length = %d, want %d", len(result), len(tt.expected))
			}
			for i, exp := range tt.expected {
				if result[i] != exp {
					t.Errorf("variantCPRA()[%d] = %q, want %q", i, result[i], exp)
				}
			}
		})
	}
}

func TestSummaryBytesStringWithCPRA(t *testing.T) {
	tests := []struct {
		name      string
		setup     func() [][]byte
		delimiter string
		cpra      bool
		validate  func(t *testing.T, result []string)
		wantErr   bool
	}{
		{
			name: "single variant with CPRA prepended",
			setup: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{"pval", "beta", "sebeta", "af"},
					Rows: map[string]*SummaryValues{
						"1\t12345\tA\tT": {Values: []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"}},
					},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			},
			delimiter: "\t",
			cpra:      true,
			validate: func(t *testing.T, result []string) {
				if len(result) != 1 {
					t.Fatalf("expected 1 result, got %d", len(result))
				}
				// Should start with C\tP\tR\tA\t followed by values
				expected := "1\t12345\tA\tT\t1.000000e-03\t0.500000\t0.100000\t0.300000"
				if result[0] != expected {
					t.Errorf("result = %q, want %q", result[0], expected)
				}
			},
			wantErr: false,
		},
		{
			name: "single variant without CPRA",
			setup: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{"pval", "beta", "sebeta", "af"},
					Rows: map[string]*SummaryValues{
						"1\t12345\tA\tT": {Values: []string{"1.000000e-03", "0.500000", "0.100000", "0.300000"}},
					},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			},
			delimiter: "\t",
			cpra:      false,
			validate: func(t *testing.T, result []string) {
				if len(result) != 1 {
					t.Fatalf("expected 1 result, got %d", len(result))
				}
				// Should NOT start with C\tP\tR\tA\t
				expected := "1.000000e-03\t0.500000\t0.100000\t0.300000"
				if result[0] != expected {
					t.Errorf("result = %q, want %q", result[0], expected)
				}
			},
			wantErr: false,
		},
		{
			name: "multiple variants with CPRA",
			setup: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{"pval", "beta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT":  {Values: []string{"0.001", "0.5"}},
						"2\t200\tG\tC":  {Values: []string{"0.002", "0.6"}},
						"23\t300\tC\tG": {Values: []string{"0.003", "0.7"}},
					},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			},
			delimiter: "\t",
			cpra:      true,
			validate: func(t *testing.T, result []string) {
				if len(result) != 3 {
					t.Fatalf("expected 3 results, got %d", len(result))
				}
				// Each line should contain CPRA fields
				for _, line := range result {
					parts := strings.Split(line, "\t")
					if len(parts) < 6 { // 4 CPRA + 2 values
						t.Errorf("line has %d fields, expected at least 6: %q", len(parts), line)
					}
				}
			},
			wantErr: false,
		},
		{
			name: "multiple partitions with CPRA",
			setup: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"s1_pval", "s1_beta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5"}},
					},
				}
				rows2 := &SummaryRows{
					Header: []string{"s2_pval", "s2_beta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.003", "0.7"}},
					},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				return [][]byte{data1, data2}
			},
			delimiter: "\t",
			cpra:      true,
			validate: func(t *testing.T, result []string) {
				if len(result) != 1 {
					t.Fatalf("expected 1 result, got %d", len(result))
				}
				// CPRA + s1 values + s2 values
				expected := "1\t100\tA\tT\t0.001\t0.5\t0.003\t0.7"
				if result[0] != expected {
					t.Errorf("result = %q, want %q", result[0], expected)
				}
			},
			wantErr: false,
		},
		{
			name: "CPRA with missing values in partition",
			setup: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"s1_pval", "s1_beta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5"}},
					},
				}
				rows2 := &SummaryRows{
					Header: []string{"s2_pval", "s2_beta"},
					Rows:   map[string]*SummaryValues{
						// Variant missing in second partition
					},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				return [][]byte{data1, data2}
			},
			delimiter: "\t",
			cpra:      true,
			validate: func(t *testing.T, result []string) {
				if len(result) != 1 {
					t.Fatalf("expected 1 result, got %d", len(result))
				}
				// CPRA + s1 values + NA for s2
				expected := "1\t100\tA\tT\t0.001\t0.5\tNA\tNA"
				if result[0] != expected {
					t.Errorf("result = %q, want %q", result[0], expected)
				}
			},
			wantErr: false,
		},
		{
			name: "comma delimiter with CPRA",
			setup: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{"pval", "beta"},
					Rows: map[string]*SummaryValues{
						"1,12345,A,T": {Values: []string{"0.001", "0.5"}},
					},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			},
			delimiter: ",",
			cpra:      true,
			validate: func(t *testing.T, result []string) {
				if len(result) != 1 {
					t.Fatalf("expected 1 result, got %d", len(result))
				}
				expected := "1,12345,A,T,0.001,0.5"
				if result[0] != expected {
					t.Errorf("result = %q, want %q", result[0], expected)
				}
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buffer := tt.setup()
			result, err := SummaryBytesString(buffer, tt.delimiter, tt.cpra)
			if tt.wantErr {
				if err == nil {
					t.Error("SummaryBytesString() expected error, got none")
				}
				return
			}

			if err != nil {
				t.Errorf("SummaryBytesString() unexpected error: %v", err)
				return
			}

			if tt.validate != nil {
				tt.validate(t, result)
			}
		})
	}
}

func TestSummaryBytesStringTotalValues(t *testing.T) {
	tests := []struct {
		name        string
		setup       func() [][]byte
		delimiter   string
		cpra        bool
		expectedLen int // Expected number of fields per line
		wantErr     bool
	}{
		{
			name: "single partition - verify totalValues calculation",
			setup: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{"pval", "beta", "sebeta", "af"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5", "0.1", "0.3"}},
					},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			},
			delimiter:   "\t",
			cpra:        false,
			expectedLen: 4, // 4 values
			wantErr:     false,
		},
		{
			name: "single partition with CPRA - verify totalValues + 4",
			setup: func() [][]byte {
				rows := &SummaryRows{
					Header: []string{"pval", "beta", "sebeta", "af"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5", "0.1", "0.3"}},
					},
				}
				data, _ := proto.Marshal(rows)
				return [][]byte{data}
			},
			delimiter:   "\t",
			cpra:        true,
			expectedLen: 8, // 4 CPRA + 4 values
			wantErr:     false,
		},
		{
			name: "two partitions - verify totalValues calculation",
			setup: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"s1_pval", "s1_beta", "s1_sebeta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5", "0.1"}},
					},
				}
				rows2 := &SummaryRows{
					Header: []string{"s2_pval", "s2_beta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.002", "0.6"}},
					},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				return [][]byte{data1, data2}
			},
			delimiter:   "\t",
			cpra:        false,
			expectedLen: 5, // 3 from s1 + 2 from s2
			wantErr:     false,
		},
		{
			name: "two partitions with CPRA - verify totalValues + 4",
			setup: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"s1_pval", "s1_beta", "s1_sebeta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5", "0.1"}},
					},
				}
				rows2 := &SummaryRows{
					Header: []string{"s2_pval", "s2_beta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.002", "0.6"}},
					},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				return [][]byte{data1, data2}
			},
			delimiter:   "\t",
			cpra:        true,
			expectedLen: 9, // 4 CPRA + 3 from s1 + 2 from s2
			wantErr:     false,
		},
		{
			name: "three partitions with varying header lengths",
			setup: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"s1_pval", "s1_beta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5"}},
					},
				}
				rows2 := &SummaryRows{
					Header: []string{"s2_pval", "s2_beta", "s2_sebeta", "s2_af"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.002", "0.6", "0.2", "0.3"}},
					},
				}
				rows3 := &SummaryRows{
					Header: []string{"s3_pval"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.003"}},
					},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				data3, _ := proto.Marshal(rows3)
				return [][]byte{data1, data2, data3}
			},
			delimiter:   "\t",
			cpra:        false,
			expectedLen: 7, // 2 + 4 + 1
			wantErr:     false,
		},
		{
			name: "three partitions with CPRA and varying header lengths",
			setup: func() [][]byte {
				rows1 := &SummaryRows{
					Header: []string{"s1_pval", "s1_beta"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.001", "0.5"}},
					},
				}
				rows2 := &SummaryRows{
					Header: []string{"s2_pval", "s2_beta", "s2_sebeta", "s2_af"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.002", "0.6", "0.2", "0.3"}},
					},
				}
				rows3 := &SummaryRows{
					Header: []string{"s3_pval"},
					Rows: map[string]*SummaryValues{
						"1\t100\tA\tT": {Values: []string{"0.003"}},
					},
				}
				data1, _ := proto.Marshal(rows1)
				data2, _ := proto.Marshal(rows2)
				data3, _ := proto.Marshal(rows3)
				return [][]byte{data1, data2, data3}
			},
			delimiter:   "\t",
			cpra:        true,
			expectedLen: 11, // 4 CPRA + 2 + 4 + 1
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buffer := tt.setup()
			result, err := SummaryBytesString(buffer, tt.delimiter, tt.cpra)
			if tt.wantErr {
				if err == nil {
					t.Error("SummaryBytesString() expected error, got none")
				}
				return
			}

			if err != nil {
				t.Errorf("SummaryBytesString() unexpected error: %v", err)
				return
			}

			if len(result) == 0 {
				t.Fatal("SummaryBytesString() returned empty result")
			}

			// Verify field count matches expected
			for i, line := range result {
				fields := strings.Split(line, tt.delimiter)
				if len(fields) != tt.expectedLen {
					t.Errorf("result[%d] has %d fields, expected %d: %q", i, len(fields), tt.expectedLen, line)
				}
			}
		})
	}
}
