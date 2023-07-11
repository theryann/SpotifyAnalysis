import { vinyChart } from "./main.js";
import { loadSongs } from "./log.js";

function makeTable(data, identifier) {
    let table = document.createElement('table');
    table.classList = "overview-table"

    data.forEach(d => {
        let row = table.insertRow();

        let img = document.createElement("img")
        img.src = d.img;
        let imgCell = row.insertCell();
        imgCell.appendChild(img)
        imgCell.classList = "icon-cell"

        let item = row.insertCell();
        let itemLink = document.createElement('a')

        itemLink.textContent = d[identifier];
        itemLink.classList = 'hyperlink'

        // generate link depending on wether data is artist|song|album
        switch (identifier) {
            case 'artist': itemLink.href = `/artist.html?artist-id=${d.id}`; break;
            case 'title': itemLink.href  = `/song.html?song-id=${d.ID}`; break;
            case 'album': itemLink.href  = `/album.html?album-id=${d.ID}`; break;
        }
        item.appendChild(itemLink);

        let streams = row.insertCell();
        streams.classList = "stream-number";
        streams.textContent = d.streams;
        streams.textContent = makeTimestamp(d.sumPlaytimeMS);


    });
    return table;
}

function makeTimestamp(milliseconds) {
    let durationMin   = Math.floor(milliseconds / 1000 / 60);
    let durationHours = Math.floor(durationMin / 60);
    let remainingSec  = Math.floor((milliseconds / 1000) - durationMin * 60)
    let timeStamp = '';

    if (durationHours > 0) {
        timeStamp += `${durationHours}h `
        durationMin -= durationHours * 60;
        durationMin = (durationMin.toString().length > 1) ? durationMin : '0'.concat(durationMin)
    }

    remainingSec = remainingSec.toString()
    remainingSec = (remainingSec.length > 1) ? remainingSec : '0'.concat(remainingSec)

    timeStamp += `${durationMin}:${remainingSec} min`;
    return timeStamp;
}

window.onload = () => {

    // timeframe to consider (earliest included date)
    let timeLimitDays = 10;
    let order = ''
    order = '&order=playtime'

    let today = Date.now();
    let timeLimit = today - timeLimitDays * 3600 * 24 * 1000
    let cutoffTimestamp = (new Date(timeLimit)).toISOString()

    let limit = 8; // number of results
    let songPromise   = fetch(`/songs/top?limit=${limit}${order}&oldest=${cutoffTimestamp}`).then(res => res.json());
    let artistPromise = fetch(`/artists/top?limit=${limit}${order}&oldest=${cutoffTimestamp}`).then(res => res.json());
    let albumPromise  = fetch(`/album/top?limit=${limit}${order}&oldest=${cutoffTimestamp}`).then(res => res.json());

    let songTab = document.getElementById('songs-content');
    let artistsTab = document.getElementById('artists-content');
    let albumTab = document.getElementById('albums-content');
    let labelTimeFrame = document.getElementById('label-timeframe');

    labelTimeFrame.innerText = `last ${timeLimitDays} days`;

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

    loadSongs(0);

    vinyChart(400);
}

export {makeTable, makeTimestamp}