package main

import (
	"encoding/json"
	"fmt"
	"reflect"
	"runtime"
	"syscall/js"
)

func jsToGo(v js.Value, targetT reflect.Type) (reflect.Value, error) {
	// Handle pointer types by unwrapping once
	if targetT.Kind() == reflect.Ptr {
		elem, err := jsToGo(v, targetT.Elem())
		if err != nil {
			return reflect.Value{}, err
		}
		ptr := reflect.New(targetT.Elem())
		ptr.Elem().Set(elem)
		return ptr, nil
	}

	// Get the underlying kind for type aliases
	kind := targetT.Kind()

	switch kind {
	case reflect.String:
		return reflect.ValueOf(v.String()).Convert(targetT), nil

	case reflect.Bool:
		return reflect.ValueOf(v.Bool()).Convert(targetT), nil

	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		val := reflect.New(targetT).Elem()
		val.SetInt(int64(v.Int()))
		return val, nil

	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		val := reflect.New(targetT).Elem()
		val.SetUint(uint64(v.Int()))
		return val, nil

	case reflect.Float32, reflect.Float64:
		val := reflect.New(targetT).Elem()
		val.SetFloat(v.Float())
		return val, nil

	case reflect.Slice:
		// Special case: []byte from JS binary types
		if targetT.Elem().Kind() == reflect.Uint8 {
			return jsToGoBytes(v, targetT)
		}

		// Generic slice from JS array
		// Note: JavaScript arrays are objects with a numeric length property
		if v.Type() != js.TypeObject {
			return reflect.Value{}, fmt.Errorf("expected object/array for %s, got %s", targetT, v.Type())
		}

		lengthProp := v.Get("length")
		if lengthProp.Type() != js.TypeNumber {
			return reflect.Value{}, fmt.Errorf("expected array (object with length property) for %s", targetT)
		}

		length := lengthProp.Int()
		slice := reflect.MakeSlice(targetT, length, length)
		for i := 0; i < length; i++ {
			elemVal, err := jsToGo(v.Index(i), targetT.Elem())
			if err != nil {
				return reflect.Value{}, fmt.Errorf("slice element %d: %w", i, err)
			}
			slice.Index(i).Set(elemVal)
		}
		return slice, nil

	case reflect.Struct:
		// Assume JS object or JSON string to struct via JSON
		jsonStr, err := jsValueToJSON(v)
		if err != nil {
			return reflect.Value{}, err
		}
		valPtr := reflect.New(targetT)
		if err := json.Unmarshal([]byte(jsonStr), valPtr.Interface()); err != nil {
			return reflect.Value{}, fmt.Errorf("json unmarshal into %s: %w", targetT, err)
		}
		return valPtr.Elem(), nil
	}

	return reflect.Value{}, fmt.Errorf("unsupported parameter type: %s", targetT)
}

// Handles Uint8Array, ArrayBuffer or plain JS arrays of numbers
func jsToGoBytes(v js.Value, targetT reflect.Type) (reflect.Value, error) {
	var length int
	var uint8Array js.Value

	global := js.Global()

	// Prefer Uint8Array directly
	if v.InstanceOf(global.Get("Uint8Array")) {
		uint8Array = v
		length = v.Get("length").Int()
	} else if v.InstanceOf(global.Get("ArrayBuffer")) {
		// Turn ArrayBuffer into Uint8Array
		uint8Array = global.Get("Uint8Array").New(v)
		length = uint8Array.Get("length").Int()
	} else if v.Get("length").Type() == js.TypeNumber {
		// Fallback: treat as JS array of numbers
		length = v.Get("length").Int()
		tmp := global.Get("Uint8Array").New(length)
		for i := 0; i < length; i++ {
			tmp.SetIndex(i, v.Index(i).Int())
		}
		uint8Array = tmp
	} else {
		return reflect.Value{}, fmt.Errorf("expected Uint8Array/ArrayBuffer/Array for []byte, got %s", v.Type())
	}

	b := make([]byte, length)
	js.CopyBytesToGo(b, uint8Array)

	// NOTE: we don't keep any js.Value references; 'b' is a plain Go slice.
	return reflect.ValueOf(b).Convert(targetT), nil
}

func jsValueToJSON(v js.Value) (string, error) {
	switch v.Type() {
	case js.TypeString:
		return v.String(), nil
	case js.TypeObject:
		return js.Global().Get("JSON").Call("stringify", v).String(), nil
	default:
		return "", fmt.Errorf("cannot convert %s to JSON", v.Type())
	}
}

func goToJS(v reflect.Value) (interface{}, error) {
	if !v.IsValid() {
		return nil, nil
	}

	switch v.Kind() {
	case reflect.String:
		return v.String(), nil

	case reflect.Bool:
		return v.Bool(), nil

	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return float64(v.Int()), nil

	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return float64(v.Uint()), nil

	case reflect.Float32, reflect.Float64:
		return v.Float(), nil

	case reflect.Slice:
		// []byte -> Uint8Array
		if v.Type().Elem().Kind() == reflect.Uint8 {
			b := v.Bytes()
			u8 := js.Global().Get("Uint8Array").New(len(b))
			js.CopyBytesToJS(u8, b)
			// At this point JS owns a copy; the Go []byte can be GC’d once
			// nothing refers to it. We intentionally DON'T mutate 'v' here
			// because the callee might still be holding the slice by reference.
			return u8, nil
		}

		// generic slice -> JS array
		length := v.Len()
		arr := make([]interface{}, length)
		for i := 0; i < length; i++ {
			elem, err := goToJS(v.Index(i))
			if err != nil {
				return nil, err
			}
			arr[i] = elem
		}
		return arr, nil
	}

	// Fallback: any struct/map/etc -> JSON string
	bytes, err := json.Marshal(v.Interface())
	if err != nil {
		return nil, fmt.Errorf("json marshal: %w", err)
	}
	return string(bytes), nil
}

// WrapToJS wraps an arbitrary Go function into a js.Func.
//
// Notes on memory:
//
//   - Inputs are converted and passed to the function.
//   - After the call we drop references in the wrapper (in/out slices).
//   - []byte parameters are copied from JS (Uint8Array/ArrayBuffer/Array).
//   - []byte results are copied into a JS Uint8Array (so Go memory can be GC’d).
//   - If you know some calls are huge, you can enable runtime.GC() at the end.
func WrapToJS(fn interface{}, aggressiveGC bool) js.Func {
	v := reflect.ValueOf(fn)
	t := v.Type()
	if t.Kind() != reflect.Func {
		panic("WrapToJS: fn must be a function")
	}

	return js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		if len(args) != t.NumIn() {
			return js.ValueOf(map[string]interface{}{
				"error": fmt.Sprintf("expected %d parameters, got %d", t.NumIn(), len(args)),
			})
		}

		in := make([]reflect.Value, t.NumIn())
		for i := 0; i < t.NumIn(); i++ {
			goVal, err := jsToGo(args[i], t.In(i))
			if err != nil {
				// Drop any partial inputs so GC can reclaim
				for j := range in {
					in[j] = reflect.Value{}
				}
				return js.ValueOf(map[string]interface{}{
					"error": fmt.Sprintf("argument %d: %v", i, err),
				})
			}
			in[i] = goVal
		}

		out := v.Call(in)

		// Immediately drop inputs so they don't pin memory any longer than needed
		for i := range in {
			in[i] = reflect.Value{}
		}

		// If last result is error, handle specially
		if t.NumOut() > 0 && t.Out(t.NumOut()-1) == reflect.TypeOf((*error)(nil)).Elem() {
			errVal := out[t.NumOut()-1]
			if !errVal.IsNil() {
				err := errVal.Interface().(error)

				// Drop all outputs to help GC
				for i := range out {
					out[i] = reflect.Value{}
				}
				if aggressiveGC {
					runtime.GC()
				}

				return js.ValueOf(map[string]interface{}{
					"error": err.Error(),
				})
			}
			out = out[:t.NumOut()-1] // drop error
		}

		var jsResult interface{}
		var convErr error

		switch len(out) {
		case 0:
			jsResult = nil
		case 1:
			jsResult, convErr = goToJS(out[0])
		default:
			// multiple results returned as JS array
			res := make([]interface{}, len(out))
			for i, o := range out {
				v, err := goToJS(o)
				if err != nil {
					convErr = err
					break
				}
				res[i] = v
			}
			if convErr == nil {
				jsResult = res
			}
		}

		// Drop output reflect.Values quickly
		for i := range out {
			out[i] = reflect.Value{}
		}

		if aggressiveGC {
			runtime.GC()
		}

		if convErr != nil {
			return js.ValueOf(map[string]interface{}{
				"error": convErr.Error(),
			})
		}
		return jsResult
	})
}
