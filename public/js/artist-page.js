import { makeTable } from "./overview.js";

window.onload = async () => {
    const loader = document.querySelector('.loader');
    const fieldArtistImg = document.getElementById('item-info__img')
    const fieldArtistName = document.getElementById('item-info__name')
    const fieldArtistStreams = document.getElementById('item-info__streams')
    const wrapper = document.getElementById('wrapper')

    const urlParams = new URLSearchParams(window.location.search);
    const artistID = urlParams.get('artist-id');

    let res = await fetch(`/artists/id/${artistID}`)
    let artistInfo = await res.json();

    fieldArtistImg.src = artistInfo.imgBig;
    fieldArtistName.innerText = artistInfo.artist;
    fieldArtistStreams.innerText = artistInfo.streams;


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