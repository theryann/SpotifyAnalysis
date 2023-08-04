
function chart(data, type='bar') {
    const margin = {
        top:    6,
        bottom: 50,
        left:   40,
        right:  5,
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

    // add median line
    let median = d3.median( data.data.map(d => d.streams) )
    chart.append('line')
        .attr('x1', 0)
        .attr('y1', y(median))
        .attr('x2', width)
        .attr('y2', y(median))
        .attr('class', 'median-line')


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
        .on('click', (event, d) => {highlightValue(d, "left")})




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
        .on('click', (event, d) => {highlightValue(d, "right")})



    //  append x axis last do be ontop
    chart.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(
            d3
            .axisBottom(x)
            .tickFormat( d3.format('d') )   // eliminates commas in thousender numbers
        )

    function highlightValue(d, direction) {
        let xVal = direction === "left" ? 0 : width;
        let yVal = direction === "left" ? y(d.publications) : yStreams(d.streams);
        chart
        .append('line')
        .attr('x1', xVal)
        .attr('y1', yVal)
        .attr('x2', x(d.year))
        .attr('y2', yVal)
        .attr('stroke', 'black')
    }
}


function timeChart(data, htmlID='#wrapper', lowerLimit=0, upperLimit=3000) {
    const margin = {
        top:    40,
        bottom: 30,
        left:   30,
        right:  30,
    };

    // const charWidth = $('#wrapper').width();
    let wrapper = document.getElementById('wrapper')
    const charWidth = wrapper.getBoundingClientRect().width

    const width  = charWidth - margin.left - margin.right;
    const height = charWidth / 4 - margin.top  - margin.bottom;
    const baseline = height - margin.bottom;



    var chart = d3
        .select(htmlID)
        .append('svg')
            .attr('id', 'time-chart')
            .attr('width', charWidth)
            .attr('height', height + margin.top + margin.bottom)
        .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)

    //////////////////////
    // X - Axis
    //////////////////////

    const x = d3
        .scaleTime()
        .domain( [ new Date(data[0].day), new Date(data[data.length-1].day)] )   // value intervall +- 1 to avoid having the data to stretch over the edge as their mid is on the value
        .range( [0, width] )                     // pixels the values map to
        .nice()                                  // spaces axis description to neatly start and end at axis endpoints


    const yStreams = d3
        .scaleLinear()
        .domain( [0, d3.max(data.map(d => d.streams)) ] )
        .range([baseline, 0])
        .nice()

    let yTicks = yStreams.ticks().filter(tick => Number.isInteger(tick)) // specify ticks to avoid decimals

    chart.append('g')
        .attr('transform', `translate(${0}, 0)`)
        .call(
            d3.axisLeft(yStreams)
            .tickValues(yTicks)
            .tickFormat(d3.format('d'))
        )

    // append streams
    chart.selectAll()
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x( new Date(d.day) ))
        .attr('y', d => yStreams(d.streams))
        .attr('height', d => baseline - yStreams(d.streams))
        .attr('width', 3 )



    //  append x axis last do be ontop
    chart.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call( d3.axisBottom(x) )



}



function clock(data) {
    let dim = $('#wrapper').width() / 3

    const margin = {
        top:    30,
        bottom: 30,
        left:   50,
        right:  30,
    }

    const width  = dim - margin.left - margin.right;
    const height = dim - margin.top  - margin.bottom;

    var chart = d3
        .select("#wrapper")
        .append('svg')
            .attr("id", "day-clock")
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
        .append('g')
            .attr('transform', `translate(${dim / 2}, ${ dim / 2})`)

    const max = d3.max(data, d => d.streams)
    const dis = d3.scaleLinear()
        .range([0, height / 2])
        .domain( [0, max ])

    chart.append('circle')
        .attr('r', height/2)
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', 'var(--clr-shade)')
        .attr('stroke', 'var(--clr-primary)')
        .attr('stroke-width', 2)

    // adding hour label
    for (let i = 0; i < 24; i++) {
        let angle = i * 2*Math.PI/24 - Math.PI / 2
        chart.append('text')
            .attr('x', Math.cos(angle) * height/2 * 1.15 - height/2*0.08)
            .attr('y', Math.sin(angle) * height/2 * 1.15 + height/2*0.05)
            .attr('fill', 'var(--text-color)')
            .attr('font-size', '.9em')
            .text(i)
    }

    // creating polygon
    let path = "";
    let hourFraction = (2 * Math.PI / 24);
    let minFraction  = (2 * Math.PI / 24 / 12)

    for (let i = 0; i < data.length; i++) {
        let d = data[i];
        let hour   = parseInt( d.time.split(':')[0] );
        let tenMin = parseInt( d.time.split(':')[1] );
        let angleRad = (hourFraction * hour) + (minFraction * tenMin) - (Math.PI / 2);

        let len = dis( d.streams ) * 0.95
        path += ` ${ Math.cos(angleRad) * len },${ Math.sin(angleRad) * len }`

        console.log(angleRad, d)
    }


    chart.append('polygon')
        .attr('points', path)
        .attr('stroke-width', 2)
        .attr('fill', 'var(--clr-primary)')
        .attr('stroke', 'var(--clr-primary-darker)')
}



window.onload = () => {
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


    // clock
    fetch('/times/top')
    .then(data => data.json())
    .then(data => {
        $('#wrapper')
        .append($('<h2></h2>')
        .addClass('stat-label')
        .text(`clock`))

        clock(data)

    })

}


export {timeChart}