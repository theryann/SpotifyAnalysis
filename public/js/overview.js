import { vinyChart } from "./main.js";
import { loadSongs } from "./log.js";

function makeTable(data, identifier, byPlaytime=false) {
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

        if (d.streams == 1) {
            streams.textContent = d.streams + " stream";  // exactly 1 because a streams > 1 doesn't cover streams == 0. Which normally can't happen but you'll never know...
        } else {
            streams.textContent = d.streams + " streams";
        }
        if (byPlaytime) {
            streams.textContent = makeTimestamp(d.sumPlaytimeMS);
        }


    });
    return table;
}

function makeTimestamp(milliseconds) {
    let durationMin   = Math.floor(milliseconds / 1000 / 60);
    let durationHours = Math.floor(durationMin / 60);
    let remainingSec  = Math.floor((milliseconds / 1000) - durationMin * 60)
    let timeStamp = '';

    remainingSec = remainingSec.toString()
    remainingSec = (remainingSec.length > 1) ? remainingSec : '0'.concat(remainingSec)

    if (durationHours > 0) {
        timeStamp += `${durationHours}h `
        durationMin -= durationHours * 60;
        durationMin = (durationMin.toString().length > 1) ? durationMin : '0'.concat(durationMin)
        timeStamp += `${durationMin}min ${remainingSec}s`;

    } else {
        timeStamp += `${durationMin}:${remainingSec} min`;
    }

    return timeStamp;
}

function fillOverviewTabs(orderBy='', timeLimitDays = 30, limit=10) {
    // orderBy ... 'streams' | 'playtime'
    // timeLimitDays ... timeframe to consider (earliest included date)


    let order = ''
    let byPlaytime = false;
    if (orderBy === 'playtime') {
        order = '&order=playtime';
        byPlaytime = true;
    }

    let today = Date.now();
    let timeLimit = today - timeLimitDays * 3600 * 24 * 1000
    let cutoffTimestamp = (new Date(timeLimit)).toISOString()

    // Limit
    $('#label-timeframe').text( `last ${timeLimitDays} days` );

    // Songs
    fetch(`/songs/top?limit=${limit}${order}&oldest=${cutoffTimestamp}`)
    .then(res => res.json())
    .then(songs => {
        $('#songs-content').append( makeTable(songs, "title", byPlaytime) )
        $('#loader-songs').remove()
    })

    // Artists
    fetch(`/artists/top?limit=${limit}${order}&oldest=${cutoffTimestamp}`)
    .then(res => res.json())
    .then(artists => {
        $('#artists-content').append( makeTable(artists, "artist", byPlaytime) )
        $('#loader-artists').remove()
    })

    // Albums
    fetch(`/album/top?limit=${limit}${order}&oldest=${cutoffTimestamp}`)
    .then(res => res.json())
    .then(albums => {
        $('#albums-content').append( makeTable(albums, "album", byPlaytime) )
        $('#loader-albums').remove()
    })
}


window.onload = () => {

    // on site load (bacuse of cache)
    // if sort by playtime
    if ( $('#toggle-order').is(':checked') ){
        fillOverviewTabs('playtime');
    } else {
        fillOverviewTabs();
    }

    // on button click
    $('#toggle-order').on('click', function() {
        $('#songs-content').empty().append( $("<div id='loader-songs' class='loader'></div>") );
        $('#artists-content').empty().append( $("<div id='loader-artists' class='loader'></div>") );
        $('#albums-content').empty().append( $("<div id='loader-albums' class='loader'></div>") );


        // if sort by playtime
        if ( $(this).is(':checked') ){
            fillOverviewTabs('playtime');
        } else {
            fillOverviewTabs();
        }

    })


    loadSongs(0); // streaming history
    // vinyChart(400);


}

export {makeTable, makeTimestamp}