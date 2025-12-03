package main

import (
	"fmt"
	"reflect"
	"runtime"
	"strings"
	"syscall/js"
)

func consoleLog(msg string) {
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
	consoleLog(fmt.Sprintf("Registered '%s' function", name))
}

func registerCallbacks(funcs []interface{}) {
	consoleLog("registerCallbacks: starting")

	for _, fn := range funcs {
		registerFunction(fn)
	}

	consoleLog("registerCallbacks: completed")
}
