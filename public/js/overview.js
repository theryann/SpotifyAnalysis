import { vinyChart } from "./main.js";

function makeTable(data, identifier) {
    let table = document.createElement('table');
    table.classList = "overview-table"

    data.forEach(d => {
        let row = table.insertRow();

        if (d.hasOwnProperty("img")) {
            let img = document.createElement("img")
            img.src = d.img;
            let imgCell = row.insertCell();
            imgCell.appendChild(img)
            imgCell.classList = "icon-cell"
        }
        let item = row.insertCell();
        item.textContent = d[identifier];

        let streams = row.insertCell();
        streams.classList = "stream-number";
        streams.textContent = d.streams;


    });
    return table;
}

window.onload = () => {
    let limit = 8;
    let songPromise   = fetch(`/songs/top?limit=${limit}`).then(res => res.json());
    let artistPromise = fetch(`/artists/top?limit=${limit}`).then(res => res.json());
    let albumPromise  = fetch(`/album/top?limit=${limit}`).then(res => res.json());

    let songTab = document.getElementById('songs-content');
    let artistsTab = document.getElementById('artists-content');
    let albumTab = document.getElementById('albums-content');

    let allLoaders = document.getElementsByClassName("loader");

    Promise.all([songPromise, artistPromise, albumPromise])
    .then(results => {
        let topSongs   = results[0];
        let topArtists = results[1];
        let topAlbums  = results[2];

        songTab.appendChild( makeTable(topSongs, "title") )
        allLoaders[0].remove()
        artistsTab.appendChild( makeTable(topArtists, "artist") )
        allLoaders[0].remove()
        albumTab.appendChild( makeTable(topAlbums, "album") )
        allLoaders[0].remove()


    })

    console.log("test1")
    vinyChart(400);
    console.log("test2")

}