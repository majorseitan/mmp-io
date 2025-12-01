package main

import (
	"fmt"
	"syscall/js"

	"github.com/mwm1/mmp-io/lib"
)

func test(this js.Value, args []js.Value) interface{} {
	if len(args) > 0 {
		name := args[0].String()
		return fmt.Sprintf("Test, %s from Go WASM!", name)
	}
	return "Test	 from Go WASM!"
}

func main() {
	fmt.Println("Hello from Go WebAssembly!")
	registerCallbacks([]interface{}{
		test,
		lib.CreateFileColumnsIndex,
		lib.BufferVariants,
		lib.BufferSummaryPasses,
		lib.SummaryBytesString,
		lib.FileHeader,
	})
	select {}
}
