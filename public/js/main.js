function randomColor() {
    let chars = '0123456789abcdef';
    let color = '#';
    for (let i=0; i<6; i++) {
        color += chars[ Math.floor(Math.random() * chars.length) ];
    }
    return color;
}

function stepColor(val, maxVal, color=[255,100,100]) {
    let d = 1 - val/maxVal;
    return `rgb( ${d*color[0]}, ${d*color[1]}, ${d*color[2]} )`
}


async function pieChart() {
    const response = await fetch("/artists/top");
    const artists  = await response.json();

    // pi - chart
    const width = 500;                                // width off whole chart
    const middlePieceRadius = 50;                 // radius of the middle pice that makes the chart look like a record
    const totalStreams = artists.reduce( (partialSum, a) => partialSum + a.streams, 0 );
    const highestSong  = artists[0].streams;  // number of streams of the most streamed song

    // base chart
    var chart = d3
        .select("#top-artists")
        .append("svg")
        .attr("width", width)
        .attr("height", width)
        .attr("viewBox", `0 0 ${width} ${width}`)
        // .attr("viewBox", `${-width/2} ${-width/2} ${width} ${width}`)
        .append("g")
        .attr("transform", `translate(${width/2},${width/2}) rotate(0) `);
        // .attr("transform", `translate(${width/2},${width/2})`)


    // add middle pice
    chart.append("circle")
        .attr("x", width/2)
        .attr("y", width/2)
        .attr("r", middlePieceRadius)
        .attr("fill", "#bb0000")
    chart.append("circle")
        .attr("x", width/2)
        .attr("y", width/2)
        .attr("r", middlePieceRadius*0.1)
        .attr("fill", "black")


    // calculate arc piece per artist
    var defs = chart.append("defs")

    var offset = 0;
    artists.forEach( (artist, i) => {
        let end = (artist.streams / totalStreams) * (2 * Math.PI);

        // create background image pattern
        let dim = width / 2
        defs
            .append("pattern")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", dim)
            .attr("height", dim)
            .attr("id", `img${i}`)
            .append("image")
            .attr("href", artist.img)
            .attr("width", dim)
            .attr("height", dim)
            .attr("x", 0)
            .attr("y", 0)
        // .attr("opacity", (artist.streams / 500))

        // create arc
        var arc = d3.arc()
            .innerRadius(middlePieceRadius)
            .outerRadius(width/2)
            .startAngle(offset)
            .endAngle(end + offset)

        // add arc to chart
        chart.append("path")
            .attr("d", arc)
            // .attr("fill", randomColor())
            .attr("fill", stepColor(artist.streams, highestSong))

        offset += end;
    });

    // animation for record

    // damit animation origin an richtiger stelle liegt muss viewBox oben auf 'width/2 width/2 width width' gesetzt werden
    // chart.append("animateTransform")
    //     // .attr("attributeType","xml")
    //     .attr("attributeName","transform")
    //     .attr("type","rotate")
    //     .attr("from","0 0 0")
    //     .attr("to","360 0 0 ")
    //     .attr("dur","90s")
    //     .attr("repeatCount","indefinite" )

}


async function vinyChart(diagramWidth=500) {
    const response = await fetch("/artists/top"); // ?oldest=2023-04-24
    const artists  = await response.json();

    // pi - vinyl - chart
    const width = diagramWidth;                   // width off whole chart
    const middlePieceRadius = width / 7.5;         // radius of the middle pice that makes the chart look like a record
    const highestSong  = artists[0].streams;      // number of streams of the most streamed song

    const pieWidth = width * 0.03;                // width of a single bar
    const maxCurve = 1 * Math.PI;                 // portion of a full circle the longest bar should max take
    const padding  = pieWidth * 1.5               // width of bar plus a factor too make differentiating easier
    const font = "Arial"

    var pie = d3
        .select("#artists-pie")
        .append("svg")
        .attr("width", width)
        .attr("height", width)
        .attr("viewBox", `0 -30 ${width*1.2} ${width*1.2}`)
        .append("g")
        .attr("transform", `translate(${width/2},${width/2}) rotate(0) `);

    // add middle pice
    pie.append("circle")
        .attr("x", width/2)
        .attr("y", width/2)
        .attr("r", middlePieceRadius)
        .attr("fill", "#bb0000")
    pie.append("circle")
        .attr("x", width/2)
        .attr("y", width/2)
        .attr("r", middlePieceRadius*0.1)
        .attr("fill", "black")
    // add vinyl cover
    pie.append("rect")
        .attr("x",4)
        .attr("y",-(width*1.1)/2)
        .attr("width", width)
        .attr("height",width*1.1)
        .attr("rx",7)
        .attr("fill", "#880000")

    const totalArtistsLabel = pie.append("text")
        .attr("x", (width/2)*1.35+4)
        .attr("y", -width/4)
        .attr("text-anchor", "end")
        .attr("font-size", pieWidth*8)
        .attr("font-family", font)
        .attr("fill", "white")
        .text('...')
    pie.append("text")
        .attr("x", (width/2)*1.3+4)
        .attr("y", -width/4+pieWidth*2)
        .attr("text-anchor", "end")
        .attr("font-size", pieWidth)
        .attr("font-family", font)
        .attr("fill", "white")
        .text("artists streamed")

    // add total number of artists to record cover
    fetch("/artists/total")
        .then(resTotalArtists => resTotalArtists.json())
        .then(totalArtistsJSON => {
            totalArtistsLabel.text( totalArtistsJSON["total-artists"] );
        })
        .catch(error => {
            console.error("Error:", error);
        });



    // add bars
    for (var i = 0; i < artists.length; i++ ) {  // for loop to break after top artists
        var artist = artists[i];
        var radius = width/2 - (padding*i);
        var angle  = (artist.streams * maxCurve) / highestSong / radius * width/2;


        // prevents "circles" (= bars that are longer than a 1/2 circle). it can happen fast at shorter bars
        // + 0.1 is there to resolve floating point errors (1/2 circle is PI so the comma values an get inaccurate)
        // if ( angle > maxCurve + 0.1 ) {
        //     continue;
        // }
        // prevents overpainting the "vinyl middle pice"
        if ( radius < middlePieceRadius + padding ) {
            break;
        }

        // each bar of radial bar chart
        var arc = d3.arc()
            .innerRadius(radius - pieWidth)
            .outerRadius(radius)
            .startAngle(Math.PI)
            .endAngle(Math.PI + angle )
            .cornerRadius(pieWidth/2)

        // add arc to chart
        pie.append("path")
            .attr("d", arc)
            .attr("fill", stepColor(artist.streams, highestSong))
            .attr("rx", "2px")
            .style("mix-blend-mode", "screen")

        // add artist name
        pie.append("text")
            .attr("x", 5)
            .attr("y", width/2 - (padding*i))
            .attr("dy", 0)
            .attr("dx", 6)
            .attr("text-anchor", "start")
            .attr("font-size", pieWidth)
            .attr("fill", "white")
            .attr("font-family", font)
            .text(artist.artist)

        // add number of streams at the end of bar
        let x = Math.cos(angle + Math.PI/2)*radius;
        let y = Math.sin(angle + Math.PI/2)*radius;
        pie.append("text")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", pieWidth*0.8)
            .attr("dx", -5)
            .attr("text-anchor", "end")
            .attr("transform", `rotate(${(180*(angle+Math.PI) / Math.PI)*0.98}, ${x}, ${y})`)
            .attr("font-size", pieWidth*0.8)
            .attr("font-family", font)
            .attr("fill", "white")
            .text(artist.streams)

    }

}


async function waveChart(diagramWidth=1000) {
    const response = await fetch("/times/daily");
    const artists  = await response.json();

    // wave - chart
    const width = diagramWidth;                   // width off whole chart
    const barWidth = width / artists.length;      // width of a single bar
    const padding  = barWidth * 1.5               // width of bar plus a factor too make differentiating easier
    const font = "Arial"

    var wave = d3
        .select("#artists-wave")
        .append("svg")
        .attr("width", width)
        .attr("height", width/2)
        .attr("viewBox", `0 0 ${width} ${width/2}`)

    artists.forEach((day, i) => {
        var value = day.streams  * 1;
        wave.append("rect")
            .attr("x", i * barWidth)
            .attr("y", (width/4)-value/2)
            .attr("width", barWidth)
            .attr("height", value)
            .attr("fill", "#880000")
    })

}

async function forceGraph(diagramWidth=1000) {
    const node_response = await fetch("/vis/force-graph/nodes");
    const edge_response = await fetch("/vis/force-graph/edges");
    const raw_nodes = await node_response.json();
    const raw_edges = await edge_response.json();

    const font = 'Arial'

    const nodes = [];
    const edges = [];

    ///////////////////////////////////
    // prepare node list and array list
    ///////////////////////////////////

    // adds all nodes that have edges to not overwhel the scene
    raw_edges.forEach( (edge) => {
        let source_id = edge.source;
        let target_id = edge.target;

        let i_source = add_node(source_id); // index in of source node in nodes array
        let i_target = add_node(target_id); // index in of target node in nodes array

        edges.push({
            source: i_source,
            target: i_target,
            weight: edge.weight
        })

    });

    function add_node(new_id) {
        // adds node form raw_nodes to nodes (if not already in)
        // returns index of the node in ny case
        let node_index = 0;
        // check if node already in array
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            if (node.id == new_id) {
                return node_index;
            }
            node_index ++;
        }
        // if reached then node is not in array so it will be added
        let index = raw_nodes.findIndex(n => n.id === new_id);
        nodes.push(raw_nodes[index]);

        return node_index;
    }

    // add some nodes that dont have edges (order by streames)
    // because niche artist with a lot streams should be included,
    // even if there are not many related artists

    // remove nodes from raw_nodes that have edges and sort the remaining by views
    nodes.forEach( (node) => {
        let raw_nodes_index = raw_nodes.findIndex(n => n.id === node.id)
        if (raw_nodes_index != -1) {
            raw_nodes.splice(raw_nodes_index, 1);
        }
    })
    raw_nodes.sort( (a,b) => (a.streams < b.streams ? 1 : -1) );

    // add remaining raw_nodes to nodes, IF they have more than n streams
    let threshold = 10;
    raw_nodes.forEach( (node) => {
        if (node.streams >= threshold) {
            add_node(node.id);
        }
    });





    ///////////////////////////////////
    // append to chart
    ///////////////////////////////////

    var graph = d3
        .select("#graph")
        .style("width", diagramWidth +"px")
        .style("height", diagramWidth/2 +"px")
        .append("svg")
        .attr("width", diagramWidth)
        .attr("height", diagramWidth/2)
        .attr("viewBox", `-${diagramWidth} -${diagramWidth/2} ${diagramWidth*4} ${diagramWidth*4}`)

    let zoomGroup = graph.append('g')
        .attr("id", "zoom-group");
    zoomGroup.append('g')
        .attr("class", "links");
    zoomGroup.append('g')
        .attr("class", "nodes");


    ///////////////////////////////////
    // simulation
    ///////////////////////////////////
    var simulation = d3
        .forceSimulation(nodes)
        .force('charge', d3.forceManyBody().strength(-100))
        .force('link',   d3.forceLink().links(edges))
        .force('center', d3.forceCenter(0,0))
        .force('collision', d3.forceCollide().radius( d => bubbleRadius(d.streams) ))
        .on('tick', ticked);

    function bubbleRadius(streams) {
        return 15* Math.sqrt( streams / Math.PI );
    }
    function updateNodes() {
        // update nodes
        var node = d3
            .select('.nodes')
            .selectAll('.node-group')
            .data(nodes)
            .join( function(group) {
                let bubble = group.append('g')
                    .attr('class', 'node-group')
                bubble.append('circle')
                    .attr('class', 'bubble')
                    .attr('r', function(d) {return bubbleRadius(d.streams)/1.2})
                bubble.append('text')
                    .attr('class', 'bubble-label')
                    .attr("text-anchor", "middle")
                    .attr("font-size", function(d) {return bubbleRadius(d.streams)/4})
                    .attr("dy", '0.25em')
                    .attr("font-family", font)
                    .text(function(d) { return d.name })
                return bubble;
            })
            .attr('transform', function(d) { return `translate(${d.x}, ${d.y})` })
            // .on('click', function(d) {
            //     let diameter = 2*bubbleRadius(d.streams);
            //     graph.attr("viewBox", `${d.x - 2*diameter} ${d.y - 2*diameter} ${4*diameter} ${4*diameter}`)
            // })
    }
    function updateLinks() {
        // update edges
        var link = d3
            .select('.links')
            .selectAll('line')
            .data(edges.filter(e => e.weight > 0))
            .join("line")
            .attr('x1', function(d) { return d.source.x } )
            .attr('y1', function(d) { return d.source.y } )
            .attr('x2', function(d) { return d.target.x } )
            .attr('y2', function(d) { return d.target.y } )
    }
    function ticked() {
        updateNodes();
        // updateLinks();
    }

    ///////////////////////////////////
    // navigating the svg
    ///////////////////////////////////
    let zoom = d3.zoom()
        .on('zoom', (e) => {
            d3.select("#zoom-group")
                .attr("transform", e.transform)
        })
    d3.select("#graph svg").call(zoom)


    // zooming

    let graphControls = document.getElementById("graph-controls");

    let zoomInButton = document.createElement("button");
    let zoomOutButton = document.createElement("button");
    let zoomHomeButton = document.createElement("button");


    zoomInButton.setAttribute('class', 'navigate-graph-button')
    zoomOutButton.setAttribute('class', 'navigate-graph-button')
    zoomHomeButton.setAttribute('class', 'navigate-graph-button')

    zoomInButton.innerText = 'In'
    zoomOutButton.innerText = 'Out'
    zoomHomeButton.innerText = 'Full'

    zoomInButton.onclick   = () => {
        d3.select('#graph svg')
          .call(zoom.scaleBy, 1.3)
    };
    zoomOutButton.onclick  = () => {
        d3.select('#graph svg')
          .call(zoom.scaleBy, 0.7)
    };
    zoomHomeButton.onclick = () => {
        d3.select('#graph svg')
          .transition()
          .call(zoom.scaleTo, 1)
    };

    graphControls.appendChild(zoomInButton)
    graphControls.appendChild(zoomOutButton)
    graphControls.appendChild(zoomHomeButton)

}

async function albumLine(diagramWidth=1000) {
    const album_response = await fetch("/album/by-year");
    const albums = await album_response.json();

    const margin = {
        top:    30,
        bottom: 30,
        left:   40,
        right:  40,
    }

    const width  = diagramWidth - margin.left - margin.right;
    const height = diagramWidth * 1.5 - margin.top  - margin.bottom;

    const albumHeight = 13;
    const dataBaseline = height - margin.bottom - albumHeight;

    var chart = d3
        .select('#album-scale')
        .append('svg')
            .attr('width', diagramWidth)
            .attr('height', height + margin.top + margin.bottom)
        .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)

    //////////////////////
    // X - Axis
    //////////////////////
    const minYear = parseInt(albums[0].year);
    const maxYear = parseInt(albums[ albums.length-1 ].year);

    var x = d3
        .scaleLinear()
        .domain( [minYear - 1, maxYear + 1] )   // value intervall +- 1 to avoid having the data to stretch over the edge as their mid is on the value
        .range( [0, width] )                     // pixels the values map to
        .nice()                                  // spaces axis description to neatly start and end at axis endpoints

    chart.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(
            d3
            .axisBottom(x)
            .tickFormat( d3.format('d') )   // eliminates commas in thousender numbers
        )

    //////////////////////
    // add albums to chart
    //////////////////////
    var albumsPerYear = {};
    chart.selectAll()
        .data(albums)
        .enter()
        .append('image')
            .attr('height', albumHeight)
            .attr('width', albumHeight)
            .attr('x', (album) => x( parseInt(album.year) ) - albumHeight/2 )
            .attr('y', (album) => {
                if (albumsPerYear.hasOwnProperty(album.year)) {
                    albumsPerYear[album.year] += 1;
                    return dataBaseline - (albumsPerYear[album.year] * albumHeight*1.05);
                } else {
                    albumsPerYear[album.year] = 0;
                    return dataBaseline;
                }
            } )
            .attr('fill', "red")
            .attr('class', "album")
            .attr('href', (album) => album.imgSmall)
            .on('click', async function(d) {
                const specificAlbum = await fetch(`/album/id/${d.id}`);
                const album = await specificAlbum.json();
                d3.selectAll('.further-details').remove()
                let infoBox = d3.select('#album-scale')
                infoBox.append('div')
                    .attr('class', 'further-details')
                    .append('img')
                    .attr('src', album.imgSmall)
                    .attr('width', 100)
                    .attr('height', 100)

            })


}

async function topBarchart(topic='songs', type='bar', diagramWidth=1000, limit=100) {
    const query = {
        songs   : 'songs/top',
        artists : 'artists/top',
        genres  : 'genres/top',
        albums  : 'album/top',
        times   : 'times/top',
        yearly  : 'times/yearly',
        monthly : 'times/monthly',
        weekly  : 'times/weekly',
        daily   : 'times/daily',
    }

    const dataName = {
        songs   : 'title',
        artists : 'artist',
        genres  : 'genre',
        albums  : 'album',
        times   : 'time',
        yearly  : 'year',
        monthly : 'month',
        weekly  : 'week',
        daily   : 'day',
    }

    const response = await fetch(`/${query[topic]}?limit=${limit}`);
    const data = await response.json();

    const attribute = dataName[topic];

    const margin = {
        top:    30,
        bottom: 50,
        left:   40,
        right:  40,
    }

    const width  = diagramWidth - margin.left - margin.right;
    const height = diagramWidth / 2 - margin.top  - margin.bottom;


    var chart = d3
        .select(`#top-${topic}-bar`)
        .append('svg')
            .attr('width', diagramWidth)
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
        .domain(data.map(d => d[attribute]))
        .padding(.15)

    const y = d3
        .scaleLinear()
        .domain( [0, Math.max(...data.map(d => d.streams))] )
        .range([baseline, 0])
        .nice()

    chart.append('g')
        .attr('transform', `translate(0, ${baseline})`)
        .call( d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'translate(-10,10) rotate(-90)')
        .style('text-anchor', 'end')

    chart.append('g')
        .call(d3.axisLeft(y))

    //////////////////////
    // add data to chart
    //////////////////////

    if (type === 'bar') {   // creates bar chart
        chart.selectAll()
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d[attribute]))
            .attr('y', d => y(d.streams))
            .attr('height', d => baseline - y(d.streams))
            .attr('width', x.bandwidth() )
            .attr("rx", "3px")
    }
    else if (type === 'line') {     // creates line chart
        const line = d3.line()
                    .x( d => x(d[attribute]) + x.bandwidth() / 2 )
                    .y( d => y(d.streams))
                    .curve( d3.curveNatural ) // interpolates rounded curve

        chart.append("path")
            .attr("d", line(data))
            .attr("class", "chart-line")
    }

}

async function progressChart(type='daily', timeFrame=0, diagramWidth=1000) {
    // tpyes: daily, weekly, , montly, yearly -> these names cause they are the api endpoints
    let data;

    const response = await fetch(`/times/${type}`);
    data = await response.json();

    formats = {
        daily   : new RegExp("^[0-9]{4}-[0-9]{2}-[0-9]{2}$"), // 2009-04-01
        weekly  : new RegExp("^[0-9]{4}\|[0-9]{2}$"),         // 2009|17
        monthly : new RegExp("^[0-9]{4}-[0-9]{2}$"),          // 2009-04
        yearly  : new RegExp("^[0-9]{4}$")                    // 2009
    }


}


window.onload = function() {
    // pieChart()
    vinyChart(500);
    forceGraph(1000);
    albumLine()
    waveChart(300);
    topBarchart('songs', type='bar', diagramWidth=1000, limit=60);
    topBarchart('artists', type='bar', diagramWidth=1000, limit=60);
    topBarchart('times', type='bar', diagramWidth=1000, limit=200);
    topBarchart('albums', type='bar', diagramWidth=1000, limit=30);
    topBarchart('weekly', type='line', diagramWidth=1000, limit=10000);
    // progressChart(type='yearly');
}