function forceGraph() {
    fetch("/vis/force-graph")
    .then(data => data.json())
    .then(data => {
        const font = 'Arial'

        let nodes = [];
        const edges = [];

        ///////////////////////////////////
        // prepare node list and array list
        ///////////////////////////////////

        // adds all nodes that have edges to not overwhel the scene
        for (let i = 0; i < data.edges.length; i++) {
            let i_source = add_node( data.edges[i].source ); // index in of source node in nodes array
            let i_target = add_node( data.edges[i].target ); // index in of target node in nodes array

            edges.push({
                source: i_source,
                target: i_target,
                weight: data.edges[i].weight
            })

        };

        function add_node(new_id) {
            // adds node form raw_nodes to nodes (if not already in)
            // returns index of the node in ny case
            nodes = nodes.filter(n => n != undefined)
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
            let index = data.nodes.findIndex(n => n.id === new_id);
            nodes.push(data.nodes[index]);

            return node_index;
        }

        // add some nodes that dont have edges (order by streames)
        // because niche artist with a lot streams should be included,
        // even if there are not many related artists

        // remove nodes from raw_nodes that have edges and sort the remaining by views
        for (let i = 0; i < nodes.length; i++) {
            let raw_nodes_index = data.nodes.findIndex(n => n.id === nodes[i].id)
            if (raw_nodes_index != -1) {
                data.nodes.splice(raw_nodes_index, 1);
            }
        }
        data.nodes.sort( (a,b) => (a.streams < b.streams ? 1 : -1) );

        // add remaining raw_nodes to nodes, IF they have more than n streams
        let threshold = 10;
        for (let i = 0; i < data.nodes.length; i++) {
            if (data.nodes[i].streams >= threshold) {
                add_node(data.nodes[i].id);
            }
        }

        ///////////////////////////////////
        // append to chart
        ///////////////////////////////////
        let width = $('#graph').width()

        var graph = d3
            .select("#graph")
            // .style("width", width +"px")
            // .style("height", width/2 +"px")
            .append("svg")
            .attr("width", width)
            .attr("height", width/2)
            .attr("viewBox", `-${width} -${width/2} ${width*4} ${width*4}`)

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
                        .attr('r', d => bubbleRadius(d.streams) / 1.2)
                    bubble.append('text')
                        .attr('class', 'bubble-label')
                        .attr("text-anchor", "middle")
                        .attr("font-size", d => bubbleRadius(d.streams)/4 )
                        .attr("dy", '0.25em')
                        .attr("font-family", font)
                        .text(function(d) { return d.name })
                    return bubble;
                })
                .attr('transform', d => `translate(${d.x}, ${d.y})` )
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
            if (Math.floor(simulation.alpha()*100) % 10 == 0 ) {
                updateNodes();
            }
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

    })


}

function collabGraph(data) {
    let width = $('#wrapper').width()
    $('#wrapper').append(
        $('<div></div>')
        .attr('id', 'collab-graph')
        .append(
            $('<div></div>').attr('id', 'collab-graph-canvas')
        )
        .append(
            $('<div></div>').attr('id', 'collab-graph-controls')
        )
    )

    let graph = d3
        .select("#collab-graph-canvas")
        .append("svg")
        .attr("width", width)
        .attr("height", width/2)
        .attr("viewBox", `-${width} -${width/2} ${width*4} ${width*4}`)

    let zoomGroup = graph.append('g')
            .attr("id", "collab-zoom-group");
        zoomGroup.append('g')
            .attr("class", "links");
        zoomGroup.append('g')
            .attr("class", "nodes");

    let simulation = d3
        .forceSimulation(data.nodes)
        .force('charge', d3.forceManyBody().strength(-200))
        .force('link',   d3.forceLink().links(data.edges))
        // .force('collision', d3.forceCollide().radius( d => d.collabs * 10))
        .force('center', d3.forceCenter(0,0))
        .on('tick', render)

    let nodes = d3.select('.nodes')
        .selectAll('text')
        .data(data.nodes)
        .join('text')
        .text(d => d.name)
        .attr("text-anchor", "middle")
        .attr("font-size", d => d.collabs )
        .attr("dy", '0.25em')

    let edges = d3.select('.links')
        .selectAll('line')
        .data(data.edges)
        .join("line")

    function render() {
        if (simulation.alpha() > 0.01) {
            return
        }
        simulation.tick(100)

        nodes
            .attr('x', d => d.x)
            .attr('y', d => d.y)
        edges
            .attr('x1', d => d.source.x )
            .attr('y1', d => d.source.y )
            .attr('x2', d => d.target.x )
            .attr('y2', d => d.target.y )


    }


    let zoom = d3.zoom()
    .on('zoom', (e) => {
        d3.select("#collab-zoom-group")
            .attr("transform", e.transform)
    })
    d3.select("#collab-graph-canvas svg").call(zoom)

}

function albumDiscovery(data, htmlID='#wrapper') {
    const margin = {
        top:    10,
        bottom: 10,
        left:   30,
        right:  30,
    };

    // const chartWidth = $('#wrapper').width();
    let wrapper = document.getElementById('wrapper')
    const chartWidth = wrapper.getBoundingClientRect().width

    const width  = chartWidth - margin.left - margin.right;
    const height = chartWidth / 4 - margin.top  - margin.bottom;
    const baseline = height - margin.bottom;

    const parent = document.querySelector(htmlID)
    parent.classList = parent.classList.remove('placeholder-broad')


    $(htmlID).append(
        $('<h2></h2>')
        .addClass('stat-label')
        .text('album obsessions (first time played two times a day)')
    )

    var chart = d3
        .select(htmlID)
        .append('svg')
            .attr('id', 'album-discovery')
            .attr('width', chartWidth)
            .attr('height', height + margin.top + margin.bottom)
        .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)


    //////////////////////
    // X - Axis
    //////////////////////
    const x = d3
        .scaleTime()
        .domain( [ new Date('2019-03'), new Date( Date.now() )] )   // value intervall +- 1 to avoid having the data to stretch over the edge as their mid is on the value
        .range( [0, width] )                     // pixels the values map to
        .nice()                                  // spaces axis description to neatly start and end at axis endpoints

    //////////////////////
    // add album covers
    //////////////////////

    // append streams
    let discoveredAlbums = [];
    for (let i = 0; i < data.length; i++ ) {
        let d = data[i];

        if (discoveredAlbums.map(a => a.id).includes(d.ID)) { continue }

        let [year, week] = d.time.split('-')
        let coverWidth  = height / 4
        let coverHeight = height / 4
        let xPos = x( new Date(year, 0, 1 + (week - 1) * 7  ) ) - coverWidth / 2
        let yPos = 0

        if (i > 0) {
            let lastIdx = discoveredAlbums.length - 1
            if (xPos < discoveredAlbums[ lastIdx ].x + coverWidth && yPos < discoveredAlbums[ lastIdx ].y + coverHeight) {
                yPos = (lastIdx % 3) * coverHeight + coverHeight / 2
            }
        }
        chart.append('line')
            .attr('x1', xPos + coverWidth / 2 )
            .attr('x2', xPos + coverWidth / 2 )
            .attr('y1', baseline )
            .attr('y2', yPos )
            .attr('class', 'section-line')

        chart.append('image')
            .attr('class', 'analytics-album-cover')
            .attr('x', xPos )
            .attr('y', yPos)
            .attr('height', coverHeight)
            .attr('width', coverWidth)
            .attr('href', d.img )
            .on('click', () => {
                window.location = `/album.html?album-id=${d.ID}`
            })


        discoveredAlbums.push({
            id: d.ID,
            x: xPos,
            y: yPos
        })
    }

    //  append x axis last do be ontop
    chart.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call( d3.axisBottom(x) )

}

function topArtistPerMonth(data, htmlID='#wrapper') {
    const margin = {
        top:    10,
        bottom: 10,
        left:   30,
        right:  30,
    };

    // const chartWidth = $('#wrapper').width();
    let wrapper = document.getElementById('wrapper')
    const chartWidth = wrapper.getBoundingClientRect().width

    const width  = chartWidth - margin.left - margin.right;
    let logoWidth = width / data.length * 0.8

    const height = logoWidth * 8 - margin.top  - margin.bottom;
    const baseline = height - margin.bottom;

    const parent = document.querySelector(htmlID)
    parent.classList = parent.classList.remove('placeholder-broad')


    $(htmlID).append(
        $('<h2></h2>')
        .addClass('stat-label')
        .text('most streamed artist of every month')
    )

    var chart = d3
        .select(htmlID)
        .append('svg')
            .attr('id', 'top-artists-per-month')
            .attr('width', chartWidth)
            .attr('height', height + margin.top + margin.bottom)
        .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)


    //////////////////////
    // X - Axis
    //////////////////////
    const x = d3
        .scaleTime()
        .domain( [ new Date('2019-03'), new Date( Date.now() )] )   // value intervall +- 1 to avoid having the data to stretch over the edge as their mid is on the value
        .range( [0, width] )                     // pixels the values map to
        .nice()                                  // spaces axis description to neatly start and end at axis endpoints

    //////////////////////
    // add album covers
    //////////////////////

    // append streams

    function calcX(d) {
        let [year, month] = d.month.split('-')
        return x( new Date(year, month - 1, 1) ) //- logoWidth / 2
    }

    function calcY(i) {
        return baseline - logoWidth * (i % 2 + 2)
    }

    chart.selectAll('line')
        .data(data)
        .enter()
        .append('line')
            .attr('x1', d => calcX(d) )
            .attr('x2', d => calcX(d) )
            .attr('y1', baseline )
            .attr('y2', (d, i) => calcY(i))
            .attr('class', 'section-line')

    chart.selectAll()
        .data(data)
        .enter()
        .append('image')
            .attr('href', d => d.imgSmall)
            .attr('x', d => calcX(d) - logoWidth / 2)
            .attr('y', (d, i) => calcY(i))
            .attr('width', logoWidth)
            .attr('height', logoWidth)
            .attr('align', 'center')
            .attr('clip-path','inset(0% round 50%)')
            .style('cursor', 'pointer')
            .on('click', (e, d) => {
                window.location = `/artist.html?artist-id=${d.artistID}`
            })


    //  append x axis last do be ontop
    chart.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call( d3.axisBottom(x) )

}


function albumPlaythrough(data, htmlID='#wrapper') {
    const margin = {
        top:    20,
        bottom: 50,
        left:   15,
        right:  5,
    };

    $(htmlID).append(
        $('<h2></h2>')
        .addClass('stat-label')
        .text('album playthroughs front to back')
    )

    let resultAmount = 30;

    const chartWidth = $(htmlID).width();
    const width  = chartWidth - margin.left - margin.right;

    let coverWidth  =  width / resultAmount;
    let coverHeight = coverWidth

    const height = coverHeight * d3.max(data.map(d => d.playthroughs))


    var chart = d3
        .select(htmlID)
        .append('svg')
            .attr('width', chartWidth)
            .attr('height', height + margin.top + margin.bottom )
        .append('g')
            .attr('transform', `translate(${margin.left}, ${2*margin.top})`)

    //////////////////////
    // Axis
    //////////////////////
    const baseline = height - margin.bottom;

    // LIMIT DISPLAYED RESULTS
    data = data.splice(0, resultAmount)

    const x = d3
        .scaleBand()
        .range([0, width])
        .domain(data.map(d => d.name))
        // .padding(.15)

    chart.append('g')
        .attr('transform', `translate(0, ${baseline})`)
        .call( d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'translate(-10,10) rotate(-45)')
        .style('text-anchor', 'end')




    //////////////////////
    // add data to chart
    //////////////////////

    data.forEach((d, i) => {
        for (let yPos = 0; yPos < d.playthroughs; yPos++) {
            chart.append('image')
                .attr('class', 'analytics-album-cover')
                .attr('x', x(d.name))
                .attr('y',  baseline - yPos * coverHeight - coverHeight)
                .attr('height', coverHeight)
                .attr('width', coverWidth)
                .attr('href', d.imgSmall )
                .on('click', () => {
                    window.location = `/album.html?album-id=${d.albumID}`
                })

        }
    })


}

function genreEvolution(data, htmlID="#wrapper") {
    const margin = {
        top:    0,
        bottom: 0,
        left:   50,
        right:  0,
    };

    $(htmlID).append(
        $('<h2></h2>')
        .addClass('stat-label')
        .text('evolution of genres listened to')
    )

    const chartWidth = $(htmlID).width();
    const width  = chartWidth - margin.left - margin.right;
    const height = 0.5 * width;
    const baseline = height - margin.bottom;

    const chart = d3
        .select(htmlID)
        .append('svg')
            .attr('width', chartWidth)
            .attr('height', height + margin.top + margin.bottom )
        .append('g')
            .attr('transform', `translate(${margin.left}, ${2*margin.top})`)

    // array to preserve order
    // 0 ..genre
    // 1 ..cursor for the current height of the pile of genres. its used in the loop and incemented
    // 2 ..points of the polygon that marks the evolution of a genre
    let points = [ ['rock', '0,'+height], ['metal', '0,'+height], ['pop', '0,'+height], ['rap', '0,'+height], ['r&b', '0,'+height], ['electronic', '0,'+height], ['indie', '0,'+height], ['classic', '0,'+height], ['jazz', '0,'+height], ['blues', '0,'+height], ['hoerspiel', '0,'+height], ['other', '0,'+height]];
    let monthWidth = width / points.length;

    // prepare data
    data = Object.entries(data)
    data.map(d => d.push(0))

    let totalStreamsThisMonth = 0;
    let streams;
    let percOfMonth = 0;

    let thisMonth;
    for (let i = 0; i < data.length; i++ ) {
        thisMonth = data[i]
        totalStreamsThisMonth = d3.sum(Object.values(data[i][1]))

        for (let j = 0; j < points.length; j++ ) {
            if ( thisMonth[1][ points[j][0] ] == undefined ) {
                streams = 0
            } else {
                streams = thisMonth[1][ points[j][0] ]
            }

            percOfMonth = streams / totalStreamsThisMonth * height

            points[j][1] += ` ${i * monthWidth},${data[i][2] + percOfMonth}`
            data[i][2] += percOfMonth

            // create last corner of plygon
            if ( i == data.length - 1 ) {
                points[j][1] += ' ' + width + ',' + height
            }
        }

    }
    // console.log(data)
    // console.log(points)

    let colAngle = 0;
    let randColor = () => {
        let col = `hsl( ${colAngle} , 53%, 50%, 1)`
        colAngle += (.5 * points.length) % 360
        // console.log(colAngle)
        return col
    }

    chart.selectAll()
        .data(points)
        .enter()
        .append('polygon')
        .attr('points', d=> d[1] )
        .style('fill', (d) => {return randColor()})
        // .attr('stroke', 'black')
        // .attr('stroke-width', 2)

}

function completedAlbums(data, htmlID='#wrapper') {
    $(htmlID).append(
        $('<h2></h2>')
        .addClass('stat-label')
        .text('all Albums listened to completely')
    )

    let numberOfUniqueAlbums = data.length;
    let numberPlaythroughs   = d3.sum( data.map(d => d.fullPlaythroughs) );
    let numberOfUniqueSongs  = d3.sum( data.map(d => d.totalTracks) );
    let numberOfSongStreams  = d3.sum( data.map(d => d.totalTracks * d.fullPlaythroughs) );

    // find how many albums make up the most streams percentage
    let dataSortedByPlaythroughs = [...data].sort((a,b) => a.fullPlaythroughs < b.fullPlaythroughs ? 1 : -1)
    let streamCummulator = 0;
    let albumsNecessary  = 0;

    for (let i = 0; i < numberOfUniqueAlbums; i++) {
        streamCummulator += dataSortedByPlaythroughs[i].totalTracks * dataSortedByPlaythroughs[i].fullPlaythroughs;
        albumsNecessary  += 1;

        if (streamCummulator >= numberOfSongStreams * 0.5) break
    }


    $(htmlID).append(
        $('<p></p>').text(`listened to ${parseInt(numberOfUniqueAlbums).toLocaleString()} albums ${parseInt(numberPlaythroughs).toLocaleString()} times`)
    )
    $(htmlID).append(
        $('<p></p>').text(`with ${parseInt(numberOfUniqueSongs).toLocaleString()} unique songs streamed ${parseInt(numberOfSongStreams).toLocaleString()} times`)
    )
    $(htmlID).append(
        $('<p></p>').text(`with ${Number(albumsNecessary/numberOfUniqueAlbums*100).toFixed(2)}% of albums making up ${Number(streamCummulator/numberOfSongStreams*100).toFixed(2)}% of streams`)
    )
    let coverContainer = $('<div></div>').addClass('album-grid')
    for (let i = 0; i < data.length; i++) {
        let link = $('<a></a>')
        link.attr('href', `/album.html?album-id=${data[i].albumID}` )
        link.append(
            $('<img>')
            .attr('src', data[i].img)
        )
        link.append(
            $('<div></div>')
            .addClass('centered-text')
            .text(data[i].fullPlaythroughs)
        )
        coverContainer.append(link)
    }
    $(htmlID).append(coverContainer)


}

window.onload = () => {
    forceGraph()

    fetch('/vis/collab-graph')
        .then(data => data.json())
        .then(data => collabGraph(data) )
    fetch('/stats/top-artists-per-month')
        .then(data => data.json())
        .then(data => topArtistPerMonth(data) )

    fetch('/stats/album-discovery')
        .then(data => data.json())
        .then(data => albumDiscovery(data) )

    fetch('/stats/genre-evolution')
        .then(data => data.json())
        .then(data => genreEvolution(data) )

    fetch('/stats/album-playthrough')
        .then(data => data.json())
        .then(data => albumPlaythrough(data) )

    fetch('/album/completed-albums')
        .then(data => data.json())
        .then(data => completedAlbums(data) )

}