BINARIES = \
	   fiddler \

BINDIR := bin

BPATHS := $(BINARIES:%=$(BINDIR)/%)
SRCFILES := $(shell find src/ -type f -name '*.go')

.PHONY: all deps fmt clean

all: $(BPATHS)

deps: export GOPATH = $(CURDIR)
deps:
	go get -d ./...

$(BPATHS): export GOPATH = $(CURDIR)
$(BPATHS): $(SRCFILES) deps
	go build -o $@ $(notdir $@)

fmt:
	go fmt ./...

clean:
	rm -rf $(BINDIR)/
