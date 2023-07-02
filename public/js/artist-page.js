import { makeTable } from "./overview.js";

window.onload = async () => {
    const loader = document.querySelector('.loader');
    const fieldArtistImg = document.getElementById('artist-info__img')
    const fieldArtistName = document.getElementById('artist-info__name')
    const fieldArtistStreams = document.getElementById('artist-info__streams')
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

    wrapper.appendChild( makeTable(artistSongs, 'title') )

    loader.remove()


}