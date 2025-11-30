package main

import (
	"fmt"
	"reflect"
	"runtime"
	"strings"
	"syscall/js"
)

func console_log(msg string) {
	js.Global().Get("console").Call("log", msg)
}

func registerFunction(fn interface{}) {
	// Get function name using runtime
	name := runtime.FuncForPC(reflect.ValueOf(fn).Pointer()).Name()
	// Extract just the function name (after last dot)
	if idx := strings.LastIndex(name, "."); idx >= 0 {
		name = name[idx+1:]
	}

	// WrapToJS returns a js.Func that can be called from JavaScript
	wrapped := WrapToJS(fn, false)

	js.Global().Set(name, wrapped)
	console_log(fmt.Sprintf("Registered '%s' function", name))
}

func registerCallbacks(funcs []interface{}) {
	console_log("registerCallbacks: starting")

	for _, fn := range funcs {
		registerFunction(fn)
	}

	console_log("registerCallbacks: completed")
}
