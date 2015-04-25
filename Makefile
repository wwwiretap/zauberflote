BINARIES = \

BINDIR := bin

BPATHS := $(BINARIES:%=$(BINDIR)/%)
SRCFILES := $(shell find src/ -type f -name '*.go')

.PHONY: all fmt clean

all: $(BPATHS)

$(BPATHS): export GOPATH = $(CURDIR)
$(BPATHS): $(SRCFILES)
	go build -o $@ $(notdir $@)

fmt:
	go fmt ./...

clean:
	rm -rf $(BINDIR)/
