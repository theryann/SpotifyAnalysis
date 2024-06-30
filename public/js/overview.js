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

    let durationDays   = Math.floor(durationHours / 24);
    let durationMonths = Math.floor(durationDays / 30);
    let durationYears  = Math.floor(durationDays / 365);

    let timeStamp = '';

    remainingSec = remainingSec.toString()
    remainingSec = (remainingSec.length > 1) ? remainingSec : '0'.concat(remainingSec)

    if (durationDays > 0) {
        // if greater than 1 days its not a time stamp but a time difference
        // most likely for how long an event id in the past

        if (durationYears > 0) {
            timeStamp += durationYears + (durationYears > 1 ? ' years ' : ' year ')

            let remainingMonths = durationMonths - durationYears * 12
            if (remainingMonths > 0) {
                timeStamp += remainingMonths + (remainingMonths > 1 ? ' months ' : ' month ')
            }

        } else if (durationMonths > 0) {
            timeStamp += durationMonths + (durationMonths > 1 ? ' months ' : ' month ')

        } else {
            timeStamp += durationDays + ' days'
        }

        return timeStamp + 'ago'
    }

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

function fillOverviewTabs(orderBy='streams', limit=20) {
    // orderBy ... 'streams' | 'playtime'
    // timeLimitDays ... timeframe to consider (earliest included date)

    // decide unit to order by
    let order = ''
    let byPlaytime = false;
    if (orderBy === 'playtime') {
        order = '&order=playtime';
        byPlaytime = true;
    }

    // decide timeframe
    let frame =  $('#select-timeframe').find(':selected').val();
    let cutoffTimestamp;
    let today = Date.now();

    switch (frame) {
        case 'today': {
            let timeLimit = today
            cutoffTimestamp = (new Date(timeLimit)).toISOString().slice(0, 10)
            break;
        }
        case 'month': {
            let timeLimit = today - 30 * 3600 * 24 * 1000
            cutoffTimestamp = (new Date(timeLimit)).toISOString()
            break;
        }
        case 'year': {
            cutoffTimestamp = new Date().getFullYear();
            break;
        }
        case 'alltime': {
            cutoffTimestamp = '0';
            break;
        }
    }

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

function fillForgottenHits(data, limit=10) {
    let table = $('#forgotten-hits__table')
    for (let i = 0; i < limit; i++) {
        let row = $('<tr></tr>')
        row.append(
            $('<td></td>')
            .addClass('')
            .append(
                $('<img>')
                .attr('src', data[i].img)
                .addClass('table-icon')
            )

        )
        row.append(
            $('<td></td>')
            .append(
                $('<a></a>')
                .addClass('hyperlink')
                .attr('href', '/song.html?song-id=' + data[i].ID)
                .text( data[i].title )
            )
        )
        let today = new Date();
        let lastPlayed = new Date(data[i].lastPlayed)

        row.append(
            $('<td></td>')
            .text(makeTimestamp( today - lastPlayed ))
        )

        table.append(row)
    }
}

window.onload = () => {

    // on site load (bacuse of cache)
    // if sort by playtime
    if ( $('#toggle-order').is(':checked') ){
        fillOverviewTabs('playtime');
    } else {
        fillOverviewTabs('streams');
    }

    const refreshTable = () => {
        $('#songs-content').empty().append( $("<div id='loader-songs' class='loader'></div>") );
        $('#artists-content').empty().append( $("<div id='loader-artists' class='loader'></div>") );
        $('#albums-content').empty().append( $("<div id='loader-albums' class='loader'></div>") );


        // if sort by playtime
        if ( $('#toggle-order').is(':checked') ){
            fillOverviewTabs('playtime');
        } else {
            fillOverviewTabs('streams');
        }

    }
    // on button click
    $('#toggle-order').on('click', refreshTable )
    $('#select-timeframe').on('change', refreshTable )


    // short streaming History
    loadSongs(0);
    // vinyChart(400);

    // forgotten hits
    fetch('/songs/forgotten-hits')
        .then(data => data.json())
        .then(data => fillForgottenHits(data))

}

export {makeTable, makeTimestamp}