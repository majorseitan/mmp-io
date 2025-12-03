package main

import (
	"fmt"
	"syscall/js"

	"github.com/mwm1/mmp-io/lib"
)

// Build information variables set at compile time via ldflags
var (
	BuildId      string
	BuildTime    string
	MMPioVersion string
)

func test(this js.Value, args []js.Value) interface{} {
	if len(args) > 0 {
		name := args[0].String()
		return fmt.Sprintf("Test, %s from Go WASM!", name)
	}
	return "Test	 from Go WASM!"
}

func main() {
	fmt.Printf("MMP-io version: %s, Build ID: %s, Build Time: %s\n", MMPioVersion, BuildId, BuildTime)
	registerCallbacks([]interface{}{
		test,
		lib.CreateFileColumnsIndex,
		lib.BufferVariants,
		lib.BufferSummaryPasses,
		lib.SummaryBytesString,
		lib.HeaderBytesString,
		lib.CreateHeader,
		lib.HeaderBytesString,
	})
	// Keep the program running indefinitely to serve WASM function calls
	select {}
}
