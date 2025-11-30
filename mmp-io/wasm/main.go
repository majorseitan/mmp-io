package main

import (
	"fmt"
	"syscall/js"

	"github.com/mwm1/mmp-io/lib"
)

func hello(this js.Value, args []js.Value) interface{} {
	if len(args) > 0 {
		name := args[0].String()
		return fmt.Sprintf("Hello, %s from Go WASM!", name)
	}
	return "Hello from Go WASM!"
}

func main() {
	fmt.Println("Hello from Go WebAssembly!")
	registerCallbacks([]interface{}{hello, lib.CreateFileColumnsIndex})
	select {}
}
