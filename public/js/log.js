let OFFSET = 0;
let TODAY  = null ;

function loadSongs(offset) {
    const table = document.getElementById('song-log__table')

    fetch(`/songs/history?offset=${offset}`)
    .then(data => data.json())
    .then(songs => {
        songs.forEach(song => {
            let row = document.createElement('tr')
            let time  = document.createElement('td')
            let imgCell = document.createElement('td')
            let img   = document.createElement('img')
            let title = document.createElement('td')
            let link  = document.createElement('a')

            let ts = new Date(song.timeStamp)

            if (ts.getDate() != TODAY) {
                let lineRow = document.createElement('tr')
                let lineCell = document.createElement('td')
                lineRow.appendChild(lineCell)
                lineCell.innerText = ts.toLocaleDateString('de-DE', {
                    'weekday': 'long',
                    'day': 'numeric',
                    'month': 'long',
                    'year': '2-digit',
                })
                lineCell.classList = 'overline'
                table.appendChild(lineRow)

                TODAY = ts.getDate();
            }

            time.innerText = ts.toLocaleTimeString().slice(0, 5)

            img.src = song.img;

            title.innerText = song.title

            title.classList = 'hyperlink';
            link.href = `/song.html?song-id=${song.ID}`

            link.appendChild(time)
            link.appendChild(img)
            link.appendChild(title)
            img.appendChild(imgCell)


            row.appendChild(link)
            table.appendChild(row)

        })
    })
    OFFSET += 20;
}

window.onload = () => {
    loadSongs(OFFSET);

    window.onwheel = () => {
        if ( (window.scrollY + window.innerHeight) * 1.01  >= document.documentElement.scrollHeight ) {
            loadSongs(OFFSET);
        }
    }

}

export {loadSongs}