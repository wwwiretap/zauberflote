BUILD := \
	paper

DEPS := \
	style.sty \
	paper.bib \
	components.pdf \
	scalability.eps \
	heatmap.eps \

LATEX  := pdflatex
BIBTEX := bibtex
DOT    := dot
GNUPLOT := gnuplot

RM      := rm
RMFLAGS := -rf

TARGETS := $(patsubst %, %.pdf, $(BUILD))

# generic targets

all: $(TARGETS)

clean:
	$(RM) $(RMFLAGS) *.aux *.log *.blg *.bbl *.ent *.out *.dvi *.ps *.pdf

.PHONY: all clean

# main targets

%.pdf: %.tex %.bib $(DEPS)
	$(eval SRC_$@ = $(patsubst %.tex, %, $<))
	$(LATEX) $(SRC_$@)
	$(BIBTEX) $(SRC_$@)
	$(LATEX) $(SRC_$@)
	$(LATEX) $(SRC_$@)

# graphics targets

components.pdf: components.dot
	$(DOT) -Tpdf $< > $@

scalability.eps: scalability.plt scalability.dat
	$(GNUPLOT) $<

heatmap.eps: heatmap.plt heatmap.dat
	$(GNUPLOT) $<
