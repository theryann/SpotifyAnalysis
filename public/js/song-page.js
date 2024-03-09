import { makeTimestamp } from "./overview.js";
import { timeChart } from "./stats.js";

function audioCurve(data, htmlID) {
    const parent = document.querySelector(htmlID)

    if (data.segments.length == 0) {
        parent.remove()
        return
    }

    const margin = {
        top:    20,
        bottom: 10,
        left:   10,
        right:  10,
    };

    let wrapper = document.getElementById('wrapper')
    const charWidth = wrapper.getBoundingClientRect().width

    const width  = charWidth - margin.left - margin.right;
    const height = charWidth / 7 - margin.top  - margin.bottom;
    const baseline = height - margin.bottom;

    parent.classList = parent.classList.remove('placeholder-broad')

    var chart = d3
        .select(htmlID)
        .append('svg')
            .attr('id', 'waveform-chart')
            .attr('width', charWidth)
            .attr('height', height + margin.top + margin.bottom)
        .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)

    //////////////////////
    // X - Axis
    //////////////////////
    let middle = baseline - height / 2;

    const xTime = d3
        .scaleLinear()
        .domain([0, data.segments[ data.segments.length-1 ].start + 1 ])
        .range( [0, width] )   // pixels the values map to

    const yLoudness = d3
        .scaleLinear()
        // .scaleLog()
        // .base(10)
        .domain([
            -60,
            d3.max(data.segments.map(d => d.loudnessMax))
        ])
        .range([middle, 0])



    let path = `0,${middle} `
    path += data.segments
                .map(d => `${xTime(d.start)},${yLoudness(d.loudnessStartSec)} ${xTime( d.start + d.loudnessMaxTimeSec)},${yLoudness(d.loudnessMax)}` )
                .join(' ')
    path += ' '
    path += data.segments
                .reverse()
                .map(d => `${xTime(d.start)},${baseline-yLoudness(d.loudnessStartSec)} ${xTime( d.start + d.loudnessMaxTimeSec)},${baseline-yLoudness(d.loudnessMax)}` )
                .join(' ')

    chart.append('polygon')
        .attr('points', path)
        .attr('stroke-width', .5)
        .attr('fill', 'var(--clr-primary)')
        // .attr('fill', 'transparent')
        .attr('stroke', 'var(--clr-primary-darker)')

    chart.selectAll()
        .data(data.sections)
        .enter()
        .append('line')
            .attr('x1', d => xTime(d.start))
            .attr('x2', d => xTime(d.start + d.durationSec))
            .attr('y1', -margin.top/2)
            .attr('y2', -margin.top/2)
            .style('stroke-width', 6)
            .style('stroke', d => ['darkgray', 'grey'][ Number.parseInt(data.sections.indexOf(d)) % 2 ])

    }


window.onload = async () => {
    const loader = document.querySelector('.loader');
    const fieldSongImg = document.getElementById('item-info__img')
    const fieldAlbumLink = document.getElementById('item-info__album-link')
    const fieldSongName = document.getElementById('item-info__name')
    const fieldSongStreams = document.getElementById('item-info__streams')
    const fieldArtistList = document.querySelector('.item-info')
    const fieldLyrics = document.getElementById('lyrics-unfold')
    const infoTable = document.getElementById('song-info-table')
    const wrapper = document.getElementById('wrapper')

    const urlParams = new URLSearchParams(window.location.search);
    const songID = urlParams.get('song-id');

    let res = await fetch(`/songs/id/${songID}`)
    let songInfo = await res.json();

    fieldSongImg.src = songInfo.imgBig;
    fieldAlbumLink.href = `album.html?album-id=${songInfo.albumID}`;

    fieldSongName.innerText = songInfo.title;
    fieldSongStreams.innerText = songInfo.streams;

    // artists
    songInfo.artists.forEach(artist => {
        let artistLink = document.createElement('a')
        artistLink.href = `artist.html?artist-id=${artist.ID}`

        let artistImg = document.createElement('img')
        artistImg.src = artist.img
        artistImg.classList = "search-result__img"
        artistLink.appendChild(artistImg)

        let artistLabel = document.createElement('span')
        artistLabel.innerText = artist.name
        artistLabel.classList = "artist-label"
        artistLink.appendChild(artistLabel)

        let tr = document.createElement('tr')
        let td = document.createElement('td')
        tr.appendChild(td)
        td.appendChild(artistLink)

        fieldArtistList.appendChild(tr)
    })


    fetch(`/times/song/${songID}`)
    .then(data => data.json())
    .then(data => {
        timeChart(data, '#streaming-plot')
    })

    fetch(`/songs/score/${songID}`)
    .then(data => data.json())
    .then(data => {
        audioCurve(data, '#audio-curve')
    })

    // lyrics
    if (songInfo.lyrics === '%not available%') {
        fieldLyrics.style = "animation: fade-out 2s ease-in;"
        // fieldLyrics.remove();
        setTimeout( function() {
            fieldLyrics.remove();
        }, 2000)
    } else {
        let lyrics = document.createElement('p')
        lyrics.innerText = songInfo.lyrics
        fieldLyrics.appendChild(lyrics)

    }

    // info table

    let infoTableHTML = `
    <tr>
        <td>album</td>
        <td>
        <a class="hyperlink" href="album.html?album-id=${songInfo.albumID}">
            ${songInfo.albumName}
        </a>
        </td>
    </tr>
    <tr>
        <td>duration</td>
        <td>${makeTimestamp(songInfo.duration)}</td>
    </tr>
    <tr>
        <td>tempo</td>
        <td>${Math.round(songInfo.tempo)} BPM</td>
    </tr>
    <tr>
        <td>explicit</td>
        <td>${Boolean(songInfo.explicit)}</td>
    </tr>
    <tr>
        <td>mode</td>
        <td>${(songInfo.mode == 0) ? 'minor' : 'major'}</td>
    </tr>
    `
    infoTable.innerHTML = infoTableHTML


    loader.remove()

}