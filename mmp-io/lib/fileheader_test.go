package lib_test

import (
	"testing"

	libpkg "github.com/mwm1/mmp-io/lib"
)

func TestFileHeader(t *testing.T) {
	tag := "file1"
	got := libpkg.FileHeader(tag)

	if got == nil {
		t.Fatalf("FileHeader(%q) returned nil", tag)
	}

	if len(got) != 4 {
		t.Fatalf("expected 4 header fields, got %d", len(got))
	}

	expected := []string{
		"file1_pval",
		"file1_beta",
		"file1_sebeta",
		"file1_af",
	}

	for i := range expected {
		if got[i] != expected[i] {
			t.Fatalf("header[%d] = %q, want %q", i, got[i], expected[i])
		}
	}
}
