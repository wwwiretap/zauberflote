BUILD := \
	paper

DEPS := \
	style.sty \
	paper.bib

LATEX  := latex
BIBTEX := bibtex
DVIPS  := dvips
PS2PDF := ps2pdf

RM      := rm
RMFLAGS := -rf

TARGETS := $(patsubst %, %.pdf, $(BUILD))

%.dvi: %.tex %.bib $(DEPS)
	$(eval SRC_$@ = $(patsubst %.tex, %, $<))
	$(LATEX) $(SRC_$@)
	$(BIBTEX) $(SRC_$@)
	$(LATEX) $(SRC_$@)
	$(LATEX) $(SRC_$@)

%.ps: %.dvi
	$(eval SRC_$@ = $(patsubst %.tex, %, $<))
	$(DVIPS) $(SRC_$@)

%.pdf: %.ps
	$(PS2PDF) $<

all: $(TARGETS)

clean:
	$(RM) $(RMFLAGS) *.aux *.log *.blg *.bbl *.ent *.dvi *.ps *.pdf

.PHONY: all clean
