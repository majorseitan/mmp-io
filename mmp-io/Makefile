.PHONY: build clean install-wasm-exec copy test help
V=1
# Default target
all: build

# Build the WebAssembly binary
build:
	GOOS=js GOARCH=wasm go build -o main.wasm ./wasm

# Run tests
test:
	@echo "Running Go tests..."
	@go test -v ./lib/...
	@echo "✓ Tests complete"

copy: build
	mkdir -p ../public/wasm
	cp main.wasm ../public/wasm/
	cp "$$(go env GOROOT)/lib/wasm/wasm_exec.js" ../public/wasm/

# Clean build artifacts
clean:
	@rm -f main.wasm

install: build copy

# Show help
help:
	@echo "Available targets:"
	@echo "  make build  - Build the WebAssembly binary"
	@echo "  make test   - Run Go tests"
	@echo "  make copy   - Build and copy files to public/"
	@echo "  make install - Build and copy everything"
	@echo "  make clean  - Remove build artifacts"
	@echo "  make help   - Show this help message"
