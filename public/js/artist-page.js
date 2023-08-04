import { makeTable } from "./overview.js";
import { timeChart } from "./stats.js";

window.onload = async () => {
    const loader = document.querySelector('.loader');
    const fieldArtistImg = document.getElementById('item-info__img')
    const fieldArtistName = document.getElementById('item-info__name')
    const fieldArtistStreams = document.getElementById('item-info__streams')
    const fieldArtistAlbums = document.getElementById('artist-album-list')
    const fieldSingleAlbums = document.getElementById('artist-single-list')
    const wrapper = document.getElementById('wrapper')

    const urlParams = new URLSearchParams(window.location.search);
    const artistID = urlParams.get('artist-id');

    let res = await fetch(`/artists/id/${artistID}`)
    let artistInfo = await res.json();

    fieldArtistImg.src = artistInfo.imgBig;
    fieldArtistName.innerText = artistInfo.artist;
    fieldArtistStreams.innerText = artistInfo.streams;





    fetch(`/times/artist/${artistID}`)
    .then(data => data.json())
    .then(data => {
        timeChart(data)
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


    let resSongs = await fetch(`/songs/top?artist=${artistID}`)
    let artistSongs = await resSongs.json();

    let details = document.createElement('details')
    details.open = true;

    let detailsSummary = document.createElement('summary')
    detailsSummary.innerText = 'songs'
    detailsSummary.classList = 'details__summary'
    details.appendChild(detailsSummary)
    details.appendChild( makeTable(artistSongs, 'title') )
    wrapper.appendChild(details)


    loader.remove()


}