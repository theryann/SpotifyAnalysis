import { makeTimestamp } from "./overview.js";

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


    // lyrics
    let lyrics = document.createElement('p')
    lyrics.innerText = songInfo.lyrics
    fieldLyrics.appendChild(lyrics)

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