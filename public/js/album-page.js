import { makeTimestamp } from "./overview.js";
import { timeChart } from "./stats.js";


window.onload = async () => {
    const loader = document.querySelector('.loader');
    const fieldAlbumImg = document.querySelector('#album-cover__cover img')
    const fieldAlbumHole = document.querySelector('#album-cover__hole img')
    const fieldAlbumName = document.getElementById('item-info__name')
    const fieldAlbumStreams = document.getElementById('item-info__streams')
    const fieldArtistName = document.getElementById('item-info__extra')
    const fieldYear = document.getElementById('item-info__year')
    const fieldTracklist = document.getElementById('item-info__tracklist')

    const wrapper = document.getElementById('wrapper')

    const urlParams = new URLSearchParams(window.location.search);
    const albumID = urlParams.get('album-id');

    let res = await fetch(`/album/id/${albumID}`)
    let albumInfo = await res.json();

    fieldAlbumHole.src = albumInfo.imgBig;
    fieldAlbumImg.src = albumInfo.imgBig;
    fieldAlbumName.innerText = albumInfo.name
    fieldAlbumStreams.innerText = albumInfo.streams

    const artistLink  = document.createElement('a')
    const artistLabel = document.createElement('span')

    artistLink.href = `artist.html?artist-id=${albumInfo.artistID}`
    artistLink.classList = 'hyperlink'

    artistLabel.innerText = albumInfo.artist

    let artistImg = document.createElement('img')
    artistImg.src = albumInfo.artistImg
    artistImg.classList = "search-result__img"
    artistLink.appendChild(artistImg)
    artistLink.appendChild(artistLabel)


    fieldArtistName.appendChild(artistLink)


    fieldYear.innerText = new Date(albumInfo.releaseDate).toLocaleDateString('de-DE', {
        'day': '2-digit',
        'month': '2-digit',
        'year': 'numeric',
    })

    let resTracklist = await fetch(`/album/tracklist/${albumID}`)
    let albumTracklist = await resTracklist.json();


    // artists

    albumTracklist.forEach(track => {
        let songLink = document.createElement('a')
        songLink.href = `song.html?song-id=${track.ID}`

        let songLabel = document.createElement('span')
        songLabel.innerText = track.title
        songLabel.classList = "artist-label"
        songLink.appendChild(songLabel)

        let tr = document.createElement('tr')
        let tdLink = document.createElement('td')
        tr.appendChild(tdLink)
        tdLink.appendChild(songLink)

        let tdTimestamp = document.createElement('td')

        tdTimestamp.innerText = makeTimestamp(track.duration)
        tr.appendChild(tdTimestamp)

        fieldTracklist.appendChild(tr)
    })

    fetch(`/times/album/${albumID}`)
    .then(data => data.json())
    .then(data => {
        timeChart(data, '#streaming-plot')
    })




    loader.remove()

}