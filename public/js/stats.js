
function chart(data, type='bar') {
    const margin = {
        top:    6,
        bottom: 50,
        left:   40,
        right:  40,
    };

    const charWidth = $('#wrapper').width();
    const width  = charWidth - margin.left - margin.right;
    const height = charWidth / 3 - margin.top  - margin.bottom;

    var chart = d3
        .select('#wrapper')
        .append('svg')
            .attr('width', charWidth)
            .attr('height', height + margin.top + margin.bottom)
        .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)

    //////////////////////
    // Axis
    //////////////////////
    const baseline = height - margin.bottom;

    const x = d3
        .scaleBand()
        .range([0, width])
        .domain(data.data.map(d => d.time))
        .padding(.15)

    const y = d3
        .scaleLinear()
        .domain( [0, Math.max(...data.data.map(d => d.streams))] )
        .range([baseline, 0])
        .nice()

    chart.append('g')
        .attr('transform', `translate(0, ${baseline})`)
        .call( d3.axisBottom(x))
        .selectAll('text')
        // .attr('transform', 'translate(-10,10) rotate(-90)')
        .style('text-anchor', 'center')

    chart.append('g')
        .call(d3.axisLeft(y))


    //////////////////////
    // add data to chart
    //////////////////////

    if (type === 'bar') {
        chart.selectAll()
            .data(data.data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.time))
            .attr('y', d => y(d.streams))
            .attr('height', d => baseline - y(d.streams))
            .attr('width', x.bandwidth() )
            .attr("rx", "3px")
    }
    else {
        const line = d3
            .line()
            .x( d => x(d.time) + x.bandwidth() / 2 )
            .y( d => y(d.streams))
            .curve( d3.curveNatural ) // interpolates rounded curve

        chart.append("path")
            .attr("d", line(data.data))
            .attr("class", "chart-line")
    }


}

function publicationsByYear(data, lowerLimit=0, upperLimit=3000) {
    const margin = {
        top:    6,
        bottom: 10,
        left:   40,
        right:  40,
    };

    const charWidth = $('#wrapper').width();
    const width  = charWidth - margin.left - margin.right;
    const height = charWidth / 3 - margin.top  - margin.bottom;
    const baseline = height - margin.bottom;

    data = data.filter(d => d.year >= lowerLimit && d.year <= upperLimit);


    var chart = d3
        .select('#wrapper')
        .append('svg')
            .attr('id', 'svg-publications-by-year')
            .attr('width', charWidth)
            .attr('height', height + margin.top + margin.bottom)
        .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)

    //////////////////////
    // X - Axis
    //////////////////////
    const minYear = d3.min( data.map(d => d.year) )
    const maxYear = d3.max( data.map(d => d.year) )

    const barWidth = width / (maxYear - minYear) * 0.3;


    const x = d3
        .scaleLinear()
        .domain( [minYear - 1, maxYear + 1] )   // value intervall +- 1 to avoid having the data to stretch over the edge as their mid is on the value
        .range( [0, width] )                     // pixels the values map to
        .nice()                                  // spaces axis description to neatly start and end at axis endpoints


    const y = d3
        .scaleLinear()
        .domain( [0, d3.max(data.map(d => d.publications)) ] )
        .range([baseline, 0])
        .nice()
    chart.append('g')
        .call(d3.axisLeft(y))

    const yStreams = d3
        .scaleLinear()
        .domain( [0, d3.max(data.map(d => d.streams)) ] )
        .range([baseline, 0])
        .nice()
    chart.append('g')
        .attr('transform', `translate(${width}, 0)`)
        .call(d3.axisRight(yStreams))

    // append publications
    chart.selectAll()
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.year) - barWidth)
        .attr('y', d => y(d.publications))
        .attr('height', d => baseline - y(d.publications))
        .attr('width', barWidth )

    // append streams
    chart.selectAll()
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar-secondary')
        .attr('x', d => x(d.year))
        .attr('y', d => yStreams(d.streams))
        .attr('height', d => baseline - yStreams(d.streams))
        .attr('width', barWidth )

    //  append x axis last do be ontop
    chart.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(
            d3
            .axisBottom(x)
            .tickFormat( d3.format('d') )   // eliminates commas in thousender numbers
        )


}


$(function() {
    // monthly streams
    fetch('/times/monthly')
    .then(data => data.json())
    .then(data => {
        $('#wrapper')
        .append($('<h2></h2>')
        .addClass('stat-label')
        .text(`${data.ticks} streams`))

        chart(data, 'bar')
    })

    // songs/albuums per year
    fetch('/album/publications-by-year')
    .then(data => data.json())
    .then(data => {
        let min = Math.min(...data.map(d => d.year));
        let max = Math.max(...data.map(d => d.year));
        let mid = min + Math.floor( (max - min) / 2 );

        $('#wrapper')
        .append($('<h2></h2>')
        .addClass('stat-label')
        .text('publications'))
        .append(
            $('<form></form>')
            .append(
                $('<input type="range">')
                .addClass('year-selector')
                .attr('min', min)
                .attr('max', mid)
                .attr('value', min)
            )
            .append(
                $('<input type="range">')
                .addClass('year-selector')
                .attr('min', mid + 1)
                .attr('max', max - 1)
                .attr('value', max - 1)
            )
            .append(
                $('<span></span>')
                .addClass('slider-annotation')
                .text(`${min} - ${max}`)
            )
            .on('change', function() {
                let boundaries = [];
                $(this).children().each(function() {
                    boundaries.push( this.value )
                })
                boundaries.sort()
                publicationsByYear(data, boundaries[0], boundaries[1])
                this.nextSibling.remove()
                $(this).children('.slider-annotation').text(`${boundaries[0]} - ${boundaries[1]}`)
            })
        )


        publicationsByYear(data, min, max)
    })

})