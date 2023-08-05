import { makeTable } from "./overview.js";
import { timeChart } from "./stats.js";

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


    fetch(`/songs/top?artist=${artistID}`)
        .then(data => data.json())
        .then(artistSongs => {
            $('#wrapper').append(
                $('<h3></h3>').addClass('stat-label').text('songs')
            )

            let details = document.createElement('details')
            details.open = true;

            let detailsSummary = document.createElement('summary')
            detailsSummary.innerText = 'songs'
            detailsSummary.classList = 'details__summary'
            details.appendChild(detailsSummary)
            details.appendChild( makeTable(artistSongs, 'title') )
            wrapper.appendChild(details)
        })




    loader.remove()


}