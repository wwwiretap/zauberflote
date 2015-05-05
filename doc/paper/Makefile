BUILD := \
	paper

DEPS := \
	style.sty \
	paper.bib \
	components.eps

LATEX  := pdflatex
BIBTEX := bibtex
DOT    := dot

RM      := rm
RMFLAGS := -rf

TARGETS := $(patsubst %, %.pdf, $(BUILD))

# generic targets

all: $(TARGETS)

clean:
	$(RM) $(RMFLAGS) *.aux *.log *.blg *.bbl *.ent *.dvi *.ps *.pdf

.PHONY: all clean

# main targets

%.pdf: %.tex %.bib $(DEPS)
	$(eval SRC_$@ = $(patsubst %.tex, %, $<))
	$(LATEX) $(SRC_$@)
	$(BIBTEX) $(SRC_$@)
	$(LATEX) $(SRC_$@)
	$(LATEX) $(SRC_$@)

# graphics targets

components.eps: components.dot
	$(DOT) -Teps $< > $@
