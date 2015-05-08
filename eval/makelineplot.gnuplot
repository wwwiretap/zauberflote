set xlabel 'Simultaneous viewers'
set ylabel 'Page load time (ms)'
set title 'Page load time as number of simultaneous clients increases'
plot "linedata.dat" using 2 title 'P2P' with lines, "linedata.dat" using 3 title 'HTTP' with lines
