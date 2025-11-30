package lib

import (
	"fmt"
	"reflect"
	"runtime"
	"time"
)

// WrapPrintStats wraps a function and prints memory and timing stats after each call.
func WrapPrintStats[F any](fn F, logger func(string), name string) F {
	rv := reflect.ValueOf(fn)
	if rv.Kind() != reflect.Func {
		panic("WrapPrintStats: F must be a function")
	}
	rt := rv.Type()

	wrapped := reflect.MakeFunc(rt, func(in []reflect.Value) []reflect.Value {
		// Snapshot BEFORE
		var m0 runtime.MemStats
		runtime.ReadMemStats(&m0)
		start := time.Now()

		// Call original
		outs := rv.Call(in)

		// Snapshot AFTER
		elapsed := time.Since(start)
		var m1 runtime.MemStats
		runtime.ReadMemStats(&m1)

		allocs := m1.Mallocs - m0.Mallocs
		bytes := m1.TotalAlloc - m0.TotalAlloc

		logger(fmt.Sprintf("[%s] ns=%d allocs=%d bytes=%d", name, elapsed.Nanoseconds(), allocs, bytes))

		return outs
	})
	return wrapped.Interface().(F)
}
