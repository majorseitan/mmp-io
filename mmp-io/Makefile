.PHONY: build clean install-wasm-exec copy test help
V=1
all: build
# Get version from git
VERSION=$(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_ID=$(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME=$(shell date -u '+%Y-%m-%d_%H:%M:%S')

# Build flags
LDFLAGS=-X main.MMPioVersion=$(VERSION) -X main.BuildID=$(BUILD_ID) -X main.BuildTime=$(BUILD_TIME)


build: lib/mmp-io.pb.go
	GOOS=js GOARCH=wasm go build -ldflags "$(LDFLAGS)" -o main.wasm ./wasm

test:
	@echo "Running Go tests..."
	@go test -v ./lib/...
	@echo "✓ Tests complete"

copy: build
	mkdir -p ../public/wasm
	cp main.wasm ../public/wasm/
	cp "$$(go env GOROOT)/lib/wasm/wasm_exec.js" ../public/wasm/

lib/mmp-io.pb.go: proto/*.proto buf.yaml buf.gen.yaml
	buf generate

clean:
	@rm -f main.wasm

install: build copy

help:
	@echo "Available targets:"
	@echo "  make build  - Build the WebAssembly binary"
	@echo "  make test   - Run Go tests"
	@echo "  make copy   - Build and copy files to public/"
	@echo "  make install - Build and copy everything"
	@echo "  make clean  - Remove build artifacts"
	@echo "  make help   - Show this help message"
