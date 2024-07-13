import { makeTable } from "./overview.js";
import { timeChart } from "./stats.js";

function albumStreamChart(album, mostStreames) {
    const margin = {
        top:    30,
        bottom: 30,
        left:   5,
        right:  5,
    }

    let width = $('#wrapper').width() / 3
    let height = width / 2;
    let coverWidth = width / 2;
    let spaceBetween = 1;

    let fontSize = height / (Math.max( 14, album.length ) + spaceBetween ) ;

    const yPos = function(i) {
        return i * (fontSize + spaceBetween) + fontSize
    }

    const chart = d3
    .select('#album-streams')
    .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
            .attr('transform', `translate( ${margin.left}, 0 )`)

    let mask = chart.append('mask')
        .attr('x', coverWidth)
        .attr('y', 0)
        .attr('id', 'mask-cover')
        .attr('width', coverWidth)
        .attr('height', coverWidth)
        .attr('fill', 'black')


    chart.append('rect')
        .attr('x', coverWidth)
        .attr('y', 0)
        .attr('width', coverWidth)
        .attr('height', coverWidth)
        .attr('href', album[0].imgBig)
        // .attr('class', 'album-stream-cover')
        .attr('fill', 'green')
        .attr('mask', 'url(#mask-cover)')

    // chart.append('image')
    //     .attr('x', coverWidth)
    //     .attr('y', 0)
    //     .attr('width', coverWidth)
    //     .attr('height', coverWidth)
    //     .attr('href', album[0].imgBig)
    //     // .attr('class', 'album-stream-cover')
    //     .attr('mask', 'url(#mask-cover)')

    album.forEach((song, i) => {
        chart.append('text')
            .attr('x', coverWidth - 5 )
            .attr('y', yPos(i) )
            .attr('class', 'album-stream-cover__song')
            .attr('alignment-baseline', 'top')
            .attr('font-size', fontSize)
            .text(song.title)

        // chart.append('rect')
        //     .attr('x', coverWidth )
        //     .attr('y', yPos(i ) - fontSize)
        //     .attr('fill', 'var(--clr-shade)')
        //     .attr('height', fontSize)
        //     .attr('width', song.streams / mostStreames * coverWidth)

        mask.append('rect')
            .attr('x', coverWidth )
            .attr('y', yPos(i ) - fontSize)
            .attr('fill', 'white')
            .attr('height', fontSize)
            .attr('width', song.streams / mostStreames * coverWidth)

    })


}


window.onload = () => {
    const loader = document.querySelector('.loader');
    const fieldArtistImg = document.getElementById('item-info__img')
    const fieldArtistName = document.getElementById('item-info__name')
    const fieldArtistStreams = document.getElementById('item-info__streams')
    const fieldArtistAlbums = document.getElementById('artist-album-list')
    const fieldSingleAlbums = document.getElementById('artist-single-list')
    const wrapper = document.getElementById('wrapper')

    const urlParams = new URLSearchParams(window.location.search);
    const artistID = urlParams.get('artist-id');

    fetch(`/artists/id/${artistID}`)
        .then(data => data.json())
        .then(artistInfo => {
            fieldArtistImg.src = artistInfo.imgBig;
            fieldArtistName.innerText = artistInfo.artist;
            fieldArtistStreams.innerText = artistInfo.streams;

            artistInfo.genres.forEach(genre => {
                $('#genre-list')
                .append(
                    $('<li></li>').text(genre)
                    )
            })

            if (artistInfo.genres.length == 0) {
                $('#genre-list').prev().remove()  // remove h3 that announces genres since there arent any
            }

        })



    fetch(`/times/artist/${artistID}`)
        .then(data => data.json())
        .then(data => {
            timeChart(data, '#streaming-plot')
        })

    fetch(`/album/by-artist/${artistID}`)
        .then(data => data.json())
        .then((albums) => {
            albums.forEach(album =>{
                let albumCover = document.createElement('img');
                let albumLink = document.createElement('a')

                albumLink.href = `album.html?album-id=${album.ID}`;
                albumLink.classList = 'hyperlink'

                albumCover.src = album.imgSmall;
                albumCover.classList = "album-cover";

                albumLink.appendChild(albumCover)
                if (album.type === 'album') {
                    fieldArtistAlbums.appendChild(albumLink)
                } else {
                    fieldSingleAlbums.appendChild(albumLink)
                }
            })
        });

    fetch(`/songs/top?artist=${artistID}&flock-albums=true`)
        .then(data => data.json())
        .then(catalogue => {
            let mostStreames = d3.max( Object.keys(catalogue).map( albumID => d3.max( catalogue[albumID].map( s => s.streams ) ) ) )

            for (let albumID in catalogue) {
                albumStreamChart( catalogue[albumID], mostStreames );
            }
        })


    fetch(`/songs/top?artist=${artistID}`)
        .then(data => data.json())
        .then(artistSongs => {
            $('#wrapper').append(
                $('<h3></h3>')
                    .addClass('stat-label')
                    .text('songs (' + artistSongs.length + ')')
            )

            let details = document.createElement('details')
            details.open = true;

            let detailsSummary = document.createElement('summary')
            detailsSummary.innerText = 'songs'
            detailsSummary.classList.add('details__summary')
            details.appendChild(detailsSummary)
            details.appendChild( makeTable(artistSongs, 'title') )
            wrapper.appendChild(details)
        })




    loader.remove()


}