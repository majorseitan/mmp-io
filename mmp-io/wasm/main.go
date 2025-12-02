package main

import (
	"fmt"
	"syscall/js"

	"github.com/mwm1/mmp-io/lib"
)

var BuildId string
var BuildTime string
var MMPioVersion string

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
		lib.FileHeader,
	})
	select {}
}
