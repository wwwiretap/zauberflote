set view map
set dgrid3d
set pm3d interpolate 4,4
set palette defined (0 0 0 0.5, 1 0 0 1, 2 0 0.5 1, 3 0 1 1, 4 0.5 1 0.5, 5 1 1 0, 6 1 0.5 0, 7 1 0 0, 8 0.5 0 0)

set xlabel font "Times-Roman,16"
set ylabel font "Times-Roman,16"
set xtics font "Times-Roman,14"
set ytics font "Times-Roman,14"
set title font "Times-Roman,20"

set title 'Page load time (ms)'
set xlabel 'Leechers'
set ylabel 'Seeders'
splot "heatmapdata.dat" using 1:2:3 with pm3d
