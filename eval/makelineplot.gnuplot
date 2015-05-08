set xlabel font "Times-Roman,16"
set ylabel font "Times-Roman,16"
set xtics font "Times-Roman,14"
set ytics font "Times-Roman,14"
set title font "Times-Roman,20"

set xlabel 'Simultaneous viewers'
set ylabel 'Page load time (ms)'
set title 'Page load time as number of simultaneous clients increases'

plot "linedata.dat" using 2 title 'P2P' with lines, "linedata.dat" using 3 title 'HTTP' with lines
