const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');


app.use( bodyParser.json() );
app.use( express.static( path.join(__dirname, "public") ) );


// using test databse for security reasons test.db
let db = new sqlite3.Database('develop.db', (err) => {
    if (err) throw err;
    console.log('[ CONNECTED ] to spotify.db');
});


// setup PREFERENCES
let preferences = {}

function loadPreferences() {
    try {
        preferences = JSON.parse( fs.readFileSync('preferences.json') );
    } catch (error) {
        fs.writeFileSync('preferences.json', JSON.stringify(preferences));
        console.error('No preference file found. Now created');
    }
}

function savePreferences() {
    try {
        fs.writeFileSync('preferences.json', JSON.stringify(preferences));
    } catch (error) {
        console.error('Error occured while saving preferences:\n', error);
    }
}

function getGeneralGenre(genre) {
    let generalGenres = [
        'rock', 'metal', 'pop', 'rap', 'r&b',
        'electronic', 'indie', 'classic',
        'jazz', 'blues', 'hoerspiel'
    ];

    if (generalGenres.includes(genre)) {
        return genre
    }

    for ( let g of genre.split(' ').reverse() ) {
        if (generalGenres.includes(g)) {
            return g
        }
    }

    for (let g of generalGenres) {
        if (genre.endsWith(g)) {
            return g
        }
        if (genre.includes(g)) {
            return g
        }
    }


    if (genre.endsWith('hardcore')) return 'metal'
    if (genre.endsWith('punk')) return 'rock'
    if (genre.endsWith('rock')) return 'rock'
    if (genre.includes('lo-fi')) return 'electronic'
    if (genre.endsWith('rave')) return 'electronic'
    if (genre.endsWith('hip hop')) return 'rap'
    if (genre.endsWith('r&b')) return 'r&b'
    if (genre.endsWith('alternative')) return 'indie'
    if (genre == 'schlager') return 'pop'
    if (genre == 'orchestra') return 'classic'
    if (genre == 'alt y') return 'indie'

    return 'other'

}


// GET Requests

app.get('/', (req, res) => {
    res.status(200);
})


app.get('/songs/total-streams', (req, res) => {
    let total_streams = `
    SELECT count(*) as 'total-streams'
    FROM Stream
    `;
    db.all(total_streams, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/songs/top', (req, res) => {
    let where_clause = '';
    let order = 'streams';
    if ( req.query.order == 'playtime' ) {
        order = 'sumPlaytimeMS';
    }
    if ( req.query.hasOwnProperty("artist") ) {
        where_clause = `
        JOIN writtenBy ON writtenBy.songID = Song.ID
        JOIN Artist ON Artist.ID = writtenBy.artistID
        WHERE Artist.ID = '${req.query.artist}'
        `;
    } else if ( req.query.hasOwnProperty("oldest") ) {
        where_clause = `WHERE Stream.timeStamp >= '${req.query.oldest}'`;  // oldest date to include
    }

    // the ID used tothe songs group by. Either Song ID or the UUID
    // with UUID re-released songs with the same title and artist but under different spotify ID
    // are still counted together
    // so we read the current setting from the preferences json file
    let groupingID = preferences.grouping === 'uuid' ? 'Song.UUID' : 'Song.ID';

    let top_songs = `
        SELECT
            Song.ID as            'ID',
            Song.albumID as       'albumID',
            Song.title as         'title',
            Song.trackNumber as   'trackNumber',
            Album.imgSmall as     'img',
            Album.imgBig as       'imgBig',
            count(*) as           'streams',
            sum(Song.duration) as 'sumPlaytimeMS'
        FROM Stream
        JOIN Song ON Stream.songID = Song.ID
        JOIN Album On Album.ID = Song.albumID
        ${where_clause}
        GROUP BY ${groupingID}
        ORDER BY ${order} desc
    `;

    if ( req.query.hasOwnProperty("limit") ) {
        top_songs += '\nLIMIT ' + req.query.limit;
    }

    db.all(top_songs, [], (err, rows)=> {
        if (err) throw err;

        if (req.query["flock-albums"] === 'true') {
            let catalogue = {};
            let albumIDs = new Set( rows.map(a => a.albumID) )
            albumIDs.forEach(albumID => {
                let album = rows.filter(r => r.albumID === albumID)
                album.sort( (a, b) => a.trackNumber > b.trackNumber ? 1 : -1 )
                catalogue[albumID] = album
            })
            res.json(catalogue)
            return;
        }

        res.json(rows);
    });
});
app.get('/songs/id/:id', (req, res) => {
    let songQuery = `
    SELECT
        Song.*,
        Album.imgBig,
        Album.imgSmall,
        Album.name as 'albumName',
        count(Stream.timeStamp) as 'streams'
    FROM Stream
    JOIN Song ON Song.ID = Stream.songID
    JOIN Album ON Album.ID = Song.albumID
    WHERE Song.ID = '${req.params.id}'
    `;

    let artistsQuery = `
    SELECT
        Artist.name,
        Artist.ID,
        Artist.imgBig as 'img'
    FROM writtenBy
    JOIN Artist ON Artist.ID = writtenBy.artistID
    WHERE writtenBy.songID = '${req.params.id}'
    `
    db.get(songQuery, [], (err, row)=> {
        if (err) throw err;
        db.all(artistsQuery, [], (err, artistsRows)=> {
            if (err) throw err;
            row.artists = artistsRows;
            res.json(row);
        });
    });
});
app.get('/songs/score/:id', (req, res) => {
    let data = {
        beats: [],
        bars: [],
        segments: [],
        sections: [],
    }
    let segmentQuery = `
    SELECT
        start,
        durationSec,
        loudnessStartSec,
        loudnessMax,
        loudnessMaxTimeSec,
        loudnessEnd

    FROM Segments
    WHERE songID = '${req.params.id}'
    `;
    let sectionQuery = `
    SELECT *
    FROM Sections
    WHERE songID = '${req.params.id}'
    `;

    db.all(segmentQuery, [], (err, rows) => {
        if (err) throw err;
        data.segments = rows;
        db.all(sectionQuery, [], (err, rows) => {
            if (err) throw err;
            data.sections = rows;
            res.json(data);
        });
    });
});
app.get('/songs/history', (req, res) => {
    let offset = 0;
    if (req.query.hasOwnProperty('offset')) {
        offset = req.query.offset;
    }

    let query = `
    SELECT
        Stream.timeStamp,
        Song.ID,
        Song.title,
        Album.imgSmall as 'img'
    FROM Stream
    JOIN Song ON Song.ID = Stream.songID
    JOIN Album ON Album.ID = Song.albumID
    ORDER BY Stream.timeStamp desc
    LIMIT 20
    OFFSET ${offset}
    `;

    db.all(query, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows)
    });
});
app.get('/songs/forgotten-hits', (req, res) => {
    // get Top Songs that weren't listened to in at least a year
    let today = new Date()
    today.setFullYear( today.getFullYear() - 1 ) // subtract the year by one so we get roughly a year ago
    let dateOneYearAgoString = today.toISOString()

    let query = `
        SELECT
            Song.ID as            'ID',
            Song.UUID as            'UUID',
            Song.title as         'title',
            Album.imgSmall as     'img',
            count(*) as           'streams',
            max(Stream.timeStamp) as 'lastPlayed'
        FROM Stream
        JOIN Song ON Stream.songID = Song.ID
        JOIN Album On Album.ID = Song.albumID
        WHERE Song.ID NOt IN (
            SELECT DISTINCT Stream.songID
            FROM Stream
            WHERE Stream.timeStamp >= '${dateOneYearAgoString}'
        )
        GROUP BY Song.ID
        ORDER BY streams desc
        LIMIT 10
    `;

    db.all(query, [], (err, rows)=> {
        if (err) throw err;
        res.json(
            rows.sort((a,b) => a.lastPlayed > b.lastPlayed ? 1 : -1)
        )
    });
});
app.get('/songs/similar-songs', (req, res) => {
    let query = `
    SELECT
        Song.ID, Song.title, sectable.numSections,
        ABS(Song.tempo - ${req.query.tempo} ) as diffTempo,
        ABS(Song.energy - ${req.query.energy} ) as diffEnergy
    FROM Song
    JOIN (
        SELECT Sections.songID, count(*) as numSections
        FROM Sections
        GROUP BY Sections.songID
    ) as sectable ON sectable.songID = Song.ID
    WHERE
        Song.ID != '${req.query.songid}' AND
        Song.mode = ${req.query.mode}    AND
        Song.key  = ${req.query.key}     AND
        Song.explicit  = ${req.query.explicit}     AND
        sectable.numSections  = ${req.query.numsections}
    ORDER BY diffTempo * diffEnergy + diffTempo
    LIMIT 10
    `;

    db.all(query, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows)
    });
});


app.get('/artists/top', (req, res) => {
    let limit  = 20;
    let offset = 0;
    let order = 'streams';
    let whereClause = '';
    if ( req.query.hasOwnProperty("limit") ) {
        limit = req.query.limit;
    }
    if ( req.query.hasOwnProperty("offset") ) {
        offset = req.query.offset;
    }
    if ( req.query.hasOwnProperty("oldest") ) {
        whereClause = `WHERE Stream.timeStamp >= '${req.query.oldest}'`;  // oldest date to include
    }
    if ( req.query.order == 'playtime' ) {
        order = 'sumPlaytimeMS';
    }

    let top_artists = `
    SELECT
        artist.name as 'artist',
        count(timeStamp) as streams,
        sum(Song.duration) as sumPlaytimeMS,
        artist.imgSmall as img,
        artist.ID as id
    FROM Stream
        JOIN writtenBy ON writtenBy.songID = Stream.songID
        JOIN Artist ON Artist.ID = writtenBy.artistID
        JOIN Song ON Song.ID = writtenBy.songID
    ${whereClause}
    GROUP BY artist
    ORDER BY ${order} desc
    LIMIT ${limit} OFFSET ${offset}
    `;
    db.all(top_artists, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/artists/total', (req, res) => {
    let total_artists = `
    SELECT count(*) as 'total-artists'
    FROM artist
    `;
    db.get(total_artists, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/artists/id/:id', (req, res) => {
    let all_artists = `
    SELECT
        artist.name as 'artist',
        artist.ID as id,
        count(timeStamp) as streams,
        artist.imgSmall,
        artist.imgBig
    FROM Stream
        JOIN writtenBy ON writtenBy.songID = Stream.songID
        JOIN Artist ON Artist.ID = writtenBy.artistID
    WHERE artist.ID = '${req.params.id}'
    GROUP BY artist
    `;

    let genreQuery = `
    SELECT Genre.genre
    FROM Genre
    WHERE Genre.artistID = '${req.params.id}'
    `

    db.get(all_artists, [], (err, artistInfo)=> {
        if (err) throw err;

        db.all(genreQuery, [], (err, genreRows)=> {
            if (err) throw err;
            artistInfo['genres'] = genreRows.map(g => g.genre);
            res.json(artistInfo);
        });
    });
});
app.get('/artists/all', (req, res) => {
    let all_artists = `
    SELECT
        artist.name as 'artist',
        count(timeStamp) as streams,
        artist.imgSmall as img,
        artist.ID as id
    FROM Stream
        JOIN writtenBy ON writtenBy.songID = Stream.songID
        JOIN Artist ON Artist.ID = writtenBy.artistID
    WHERE artist.name != 'Die drei ???'
    GROUP BY artist
    ORDER BY artist desc
    `;

    if ( req.query.hasOwnProperty("limit") ) {
        all_artists += '\nLIMIT ' + req.query.limit;
        if ( req.query.hasOwnProperty("offset") ) {
            all_artists += ' OFFSET ' + req.query.limit;
        }
    }

    db.all(all_artists, [], (err, rows)=> {
        if (err)throw err;
        res.json(rows);
    });
});


app.get('/album/by-year', (req, res) => {
    let albums = `
    SELECT
        Album.name,
        Album.ID as id,
        SUBSTR(Album.releaseDate, 0, 5) as year,
        Album.imgSmall as imgSmall,
        Album.imgBig as imgBig
    FROM Album
    WHERE Album.type = 'album'
    ORDER BY Album.releaseDate asc  -- not sort by 'year' bc. day and month there are already trimmed away
    `;
    db.all(albums, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/album/publications-by-year', (req, res) => {
    let albums = `
    SELECT
        CAST(
            SUBSTR(Album.releaseDate, 0, 5)
            as INTEGER
        ) as year,
        count('year') as           'streams',
        sum(Song.duration) as 'sumPlaytimeMS',
        z.publications
    FROM Stream
    JOIN Song ON Stream.songID = Song.ID
    JOIN Album On Album.ID = Song.albumID
    JOIN (
        SELECT
            CAST(
                SUBSTR(Album.releaseDate, 0, 5)
                as INTEGER
            ) as y,
            count(*) as publications
        FROM Album
        GROUP BY y
    ) as z ON z.y = year
    GROUP BY year
    ORDER BY year asc
    `;
    db.all(albums, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/album/by-artist/:id', (req, res) => {
    let albums = `
    SELECT *
    FROM Album
    WHERE Album.artistID = '${req.params.id}'
    ORDER BY Album.type, Album.releaseDate
    `;
    db.all(albums, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/album/id/:id', (req, res) => {
    let album = `
    SELECT
        Album.ID    as id,
        Album.name  as name,
        Artist.name as artist,
        Artist.ID   as artistID,
        Artist.imgSmall   as 'artistImg',
        Album.releaseDate as 'releaseDate',
        Album.totalTracks as 'totalTracks',
        Album.fullPlaythroughs as 'fullPlaythroughs',
        Album.type,
        Album.imgBig,
        Album.imgSmall,
        count(timeStamp) as streams
    FROM Stream
    JOIN writtenBy ON writtenBy.songID = Stream.songID
    JOIN Song ON Song.ID = writtenBy.songID
    JOIN Album ON ALbum.ID = Song.albumID
    JOIN Artist ON Artist.ID = Album.artistID
    WHERE Album.ID = '${req.params.id}'
    GROUP BY Album.ID
    `;
    db.all(album, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows[0]);
    });
});
app.get('/album/top', (req, res) => {
    let limit  = 20;
    let offset = 0;
    let where_clause = "";
    let order = 'streams';
    let artist = '';
    if ( req.query.order == 'playtime' ) {
        order = 'sumPlaytimeMS';
    }
    if ( req.query.hasOwnProperty("limit") ) {
        limit = req.query.limit;
    }
    if ( req.query.hasOwnProperty("offset") ) {
        offset = req.query.offset;
    }
    if ( req.query.hasOwnProperty("oldest") ) {
        where_clause = `WHERE Stream.timeStamp >= '${req.query.oldest}'`;  // oldest date to include
    } else if ( req.query.hasOwnProperty("artist") ) {
        where_clause = `WHERE Album.artistID = '${req.query.artist}' AND Album.type = 'album'`;
    }

    let top_albums = `
        SELECT
            Album.ID as 'ID',
            Album.name as 'album',
            Artist.name as 'artist',
            albumsRanked.streams as 'streams',
            albumsRanked.sumPlaytimeMS as 'sumPlaytimeMS',
            Album.imgSmall as 'img'
        FROM
        (
            SELECT
                Song.albumID as 'ID',
                count(*)     as 'streams',
                sum(Song.duration) as 'sumPlaytimeMS'
            FROM Stream
            JOIN Song ON Stream.songID = Song.ID
            JOIN Album ON Album.ID = Song.albumID
            ${where_clause}
            GROUP BY Song.albumID
            HAVING albumID NOT NULL
            ORDER BY ${order} desc
            LIMIT ${limit} OFFSET ${offset}
        ) AS albumsRanked

        JOIN Album ON Album.ID = albumsRanked.ID
        JOIN Artist ON Artist.ID = Album.artistID
    `;
    db.all(top_albums, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/album/tracklist/:id', (req, res) => {
    let tracklist = `
    SELECT *
    FROM Song
    WHERE Song.albumID = '${req.params.id}'
    ORDER BY Song.trackNumber
    `;
    db.all(tracklist, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/album/noskiplist', (req, res) => {
    let noskipQuery = `
    SELECT
        z.albumID,
        z.name
    FROM (
        SELECT
            diffTable.albumID as albumID,
            Album.name,
            sum(songDiff) as diff
        FROM (
            SELECT
                Song.albumID,
                Song.ID as 'ID',
                count(*) as 'streams',
                CAST(a.streams as REAL) / Album.totalTracks as avgSongPlays,
                count(*) - (CAST(a.streams as REAL) / Album.totalTracks) as songDiff
            FROM Stream
            JOIN Song ON Stream.songID = Song.ID
            JOIN Album On Album.ID = Song.albumID
            JOIN (
                SELECT
                    Song.albumID as 'ID',
                    count(*)     as 'streams'
                FROM Stream
                JOIN Song ON Stream.songID = Song.ID
                GROUP BY Song.albumID
                HAVING albumID NOT NULL
                ORDER BY streams desc
            ) as a ON a.ID = Album.ID
            WHERE Album.type = 'album' AND a.streams > 10

            GROUP BY Song.ID
            ORDER BY Album.ID
        ) as diffTable
        JOIN Album ON Album.ID = albumID
        GROUP BY diffTable.AlbumID
        ORDER BY diff asc
    ) as z
    WHERE z.diff = 0
    `;
    db.all(noskipQuery, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/album/completed-albums', (req, res) => {
    // Albums that have be listened through completely
    let query = `
    SELECT
        Album.ID as albumID,
        Artist.ID as artistID,
        Artist.name as artistName,
        Album.name as albumTitle,
        Album.totalTracks,
        Artist.popularity,
        Album.fullPlaythroughs,
        Album.releaseDate,
        Album.imgSmall as img

    FROM Album
    JOIN Artist ON Artist.ID = Album.artistID
    WHERE
        fullPlaythroughs NOT NULL
        AND
        'hoerspiel' NOT IN (
            SELECT genre FROM Genre WHERE Genre.artistID = Artist.ID
        )
    --ORDER BY popularity DESC, fullPlaythroughs DESC
    ORDER BY artistName, releaseDate
    `;
    db.all(query, [], (err, rowsAlbums) => {
        if (err) throw err;

        let genreQuery = `
        SELECT *
        FROM Genre
        WHERE Genre.artistID IN (
            SELECT artistID FROM Album where fullPlaythroughs NOT NULL
        )
        `
        db.all(genreQuery, [], (err, rowsGenres) => {
            if (err) throw err;

            let albumsByGenre = {}

            for (let i = 0; i < rowsAlbums.length; i++) {
                let genresOfCurrentArtist = rowsGenres.filter(r => r.artistID == rowsAlbums[i].artistID)
                let genreCounts = {}

                for (const num of genresOfCurrentArtist) {
                    let generalGenre = getGeneralGenre(num.genre)
                    genreCounts[generalGenre] = genreCounts[generalGenre] ? genreCounts[generalGenre] + 1 : 1;
                }

                if (Object.keys(genreCounts).includes('other')) {
                    if (Object.keys(genreCounts).length > 1) {
                        delete genreCounts['other']
                    }
                }
                // find most common genre
                let mostCommonGenreOccurence = Object.values(genreCounts).sort((a,b) => b - a)[0]

                for (const genre in genreCounts) {
                    if (genreCounts[genre] == mostCommonGenreOccurence) {
                        if (albumsByGenre[ genre ]) {
                            albumsByGenre[ genre ].push(rowsAlbums[i])
                        } else {
                            albumsByGenre[ genre ] = [ rowsAlbums[i] ]
                        }
                        break;
                    }
                }

            }
            res.json(albumsByGenre)

        });


    });
});


app.get('/vis/force-graph', (req, res) => {
    let node_query = `
        SELECT
            artist.ID as id,
            artist.name as 'name',
            count(timeStamp) as streams
        FROM Stream
            JOIN writtenBy ON writtenBy.songID = Stream.songID
            JOIN Artist ON Artist.ID = writtenBy.artistID
        GROUP BY name
        ORDER BY streams desc
    `;
    let edge_query = `
    SELECT
        a.artistID as source,
        b.artistID as target,
        count(*)   as weight
    FROM
        Genre a,
        Genre b
    WHERE
        a.genre = b.genre
        AND
        a.artistID != b.artistID	-- remove edges to same node
        AND
        a.artistID > b.artistID 	-- total order to not double each edge

    GROUP BY source, target
    HAVING weight > 0
    ORDER BY weight desc
    `;


    db.all(edge_query, [], (err, edgeRows)=> {
        if (err) throw err;

        db.all(node_query, [], (err, nodeRows)=> {
            if (err) throw err;

            res.json({
                nodes: nodeRows,
                edges: edgeRows
            });
        });

    });
});
app.get('/vis/collab-graph', (req, res) => {
    let query = `
    SELECT
        a.artistID as sourceID,
        t.name as sourceName,
        b.artistID as targetID,
        z.name as targetName,
        count(*) as collabs
    FROM writtenBy as a, writtenBy as b
    JOIN Artist as t ON t.ID = sourceID
    JOIN Artist as z ON z.ID = targetID
    WHERE
        a.artistID != b.artistID
        AND
        a.songID = b.songID
        AND
        a.artistID > b.artistID
        AND
        a.artistID NOT IN (SELECT artistID FROM Genre WHERE Genre.genre = 'hoerspiel')
        --AND
        --t.popularity > 70

    GROUP BY sourceID, targetID
    ORDER BY collabs desc
    `;


    db.all(query, [], (err, rows)=> {
        if (err) throw err;

        let nodes = new Map();
        let edges = new Array();

        // fill nodes
        let nodeNumber = 0
        for (let i = 0; i < rows.length; i++) {
            if ( !nodes.has(rows[i].sourceID) ) {
                nodes.set( rows[i].sourceID, [nodeNumber, rows[i].sourceName] )
                nodeNumber ++;
            }
            if ( !nodes.has(rows[i].targetID) ) {
                nodes.set( rows[i].targetID, [nodeNumber, rows[i].targetName] )
                nodeNumber ++;
            }
        }

        // fill edges
        for (let i = 0; i < rows.length; i++) {
            edges.push({
                source: nodes.get(rows[i].sourceID)[0],
                target: nodes.get(rows[i].targetID)[0],
                weight: rows[i].collabs,
            })
        }

        res.json({
            nodes: Array.from(nodes, d => ({name: d[1][1]})),
            edges: edges,
        })
    });
});

app.get('/times/top', (req, res) => {
    // streams per times of day
    let top_times = `
        SELECT
            substr(Stream.timeStamp, 12, 4) as 'time',
            count(*) as 'streams'
        FROM Stream
        GROUP BY time
        ORDER BY time
    `;
    if ( req.query.hasOwnProperty("limit") ) {
        top_times += '\nLIMIT ' + req.query.limit;
    }

    db.all(top_times, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/times/monthly', (req, res) => {
    // streams per month
    let months = `
    SELECT
        SUBSTR(Stream.timeStamp, 0, 8) as 'time',
        COUNT(*) as 'streams'
    FROM Stream
    GROUP BY time
    ORDER BY time
    `;
    if ( req.query.hasOwnProperty("limit") ) {
        months += '\nLIMIT ' + req.query.limit;
    }

    db.all(months, [], (err, rows)=> {
        if (err) throw err;
        res.json({
            ticks: "monthly",
            data: rows
        });
    });
});
app.get('/times/weekly', (req, res) => {
    // streams per month
    let months = `
        SELECT
            strftime('%Y|%W', Stream.timeStamp) as time,
            count(*) as 'streams'
        FROM Stream
        GROUP BY time
        ORDER BY time
    `;
    if ( req.query.hasOwnProperty("limit") ) {
        months += '\nLIMIT ' + req.query.limit;
    }

    db.all(months, [], (err, rows) => {
        if (err) throw err;
        res.json({
            ticks: "weekly",
            data: rows
        });
    });
});
app.get('/times/yearly', (req, res) => {
    // streams per year
    let years = `
    SELECT
        SUBSTR(Stream.timeStamp, 0, 5) as 'time',
        COUNT(*) as 'streams'
    FROM Stream
    GROUP BY time
    ORDER BY time
    `;
    if ( req.query.hasOwnProperty("limit") ) {
        years += '\nLIMIT ' + req.query.limit;
    }

    db.all(years, [], (err, rows)=> {
        if (err) throw err;
        res.json({
            ticks: "yearly",
            data: rows
        });
    });
});
app.get('/times/daily', (req, res) => {
    // streams per day
    let days = `
    SELECT
        SUBSTR(Stream.timeStamp, 0, 11) as 'time',
        COUNT(*) as 'streams'
    FROM Stream
    GROUP BY time
    ORDER BY time
    `;
    if ( req.query.hasOwnProperty("limit") ) {
        days += '\nLIMIT ' + req.query.limit;
    }

    db.all(days, [], (err, rows)=> {
        if (err) throw err;
        res.json({
            ticks: "daily",
            data: rows
        });
    });
});
app.get('/times/song/:id', (req, res) => {
    // streams per day for this song
    let song = `
    SELECT
        substr( Stream.timeStamp, 0, 11) AS 'day',
        count(*) as streams
    FROM Stream
    WHERE Stream.songID = '${req.params.id}'
    GROUP BY day
    ORDER BY day
    `;

    db.all(song, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/times/artist/:id', (req, res) => {
    // streams per day for this artist
    let artist = `
    SELECT
        substr( Stream.timeStamp, 0, 11) AS 'day',
        count(*) as streams

    FROM Stream
    JOIN writtenBy ON writtenBy.songID = Stream.songID
    JOIN Artist ON Artist.ID = writtenBy.artistID

    WHERE Artist.ID = '${req.params.id}'
    GROUP BY day, Artist.ID
    ORDER BY day
    `;

    db.all(artist, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/times/album/:id', (req, res) => {
    // streams per day for this album
    let album = `
    SELECT
        substr(Stream.timeStamp, 0, 11) as 'day',
        count(*) as streams

    FROM Stream
    JOIN Song ON Song.ID = Stream.songID

    WHERE Song.albumID = '${req.params.id}'
    GROUP BY day
    ORDER BY day
    `;

    db.all(album, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/times/genre/:genre', (req, res) => {
    // streams per day for this genre
    let genre = decodeURIComponent(req.params.genre); // can include spaces ('post rock') and thus must be encoded and decoded to URI
    let genre_query = `
    SELECT
        substr( Stream.timeStamp, 0, 11) AS 'day',
        count(*) as streams

    FROM Stream
    JOIN writtenBy ON writtenBy.songID = Stream.songID
    JOIN Artist ON Artist.ID = writtenBy.artistID
    JOIN Genre ON Genre.artistID = Artist.ID

    WHERE Genre.genre = '${genre}'
    GROUP BY day, Genre.genre
    ORDER BY day
    `;

    db.all(genre_query, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});


app.get('/stats/general', (req, res) => {
    // streams per times of day
    let stats = `
    SELECT *, nsfw / cast(streams as REAL) as 'nsfw'
    FROM
    (
        SELECT count(*) as streams
        FROM Stream
    ),
    (
        SELECT count(*) as artists
        FROM Artist
    ),
    (
        SELECT count(*) as songs
        FROM Song
    ),
    (
        SELECT count(*) as albums
        FROM Album
    ),
    (
        SELECT count(*) as lyrics
        FROM Song
        WHERE Song.lyrics != '%not available%'
    ),
    (
        SELECT count(*) as genres
        FROM (
            SELECT *
            FROM Genre
            GROUP BY Genre.genre
        )
    ),
    (
        SELECT count(*) as nsfw
        FROM Stream
        JOIN Song ON Song.ID = Stream.songID
        WHERE Song.explicit = 1
    ),
    (
        SELECT
            AVG(d.sumPlaytimeMS) as avgDailyPlaytimeMS
        FROM (
            SELECT
                SUBSTR(Stream.timeStamp, 0, 11) as day,
                count(*) as streams,
                sum(Song.duration) as sumPlaytimeMS
            FROM Stream

            JOIN Song ON Song.ID = Stream.songID
            JOIN Album ON Album.ID = Song.albumID -- get Artist through album bc there might be multiple artist and they'd get counted individually
            JOIN Artist ON Artist.ID = Album.artistID

            GROUP BY day
            ORDER BY day desc
        ) as d
    )


    `;


    db.get(stats, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/stats/album-discovery', (req, res) => {
    // streams per times of day
    let stats = `
    SELECT z.time,
        z.ID,
        z.imgSmall as img
    FROM (
        SELECT
            strftime('%Y-%W', Stream.timeStamp) as time,
            count(albumID) as 'streams',
            Album.totalTracks,
            Album.imgSmall,
            Album.ID
        FROM Stream
        JOIN Song ON Song.ID = Stream.songID
        JOIN Album ON Album.ID = Song.albumID
        WHERE Album.type = 'album'

        GROUP BY time, Album.ID
        ORDER BY time
    ) as z
    WHERE z.streams >= CAST(2 * z.totalTracks as INTEGER);
`

    db.all(stats, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/stats/album-playthrough', (req, res) => {
    let stats = `
    SELECT
        ID as albumID,
        totalTracks,
        name,
        imgSmall,
        fullPlaythroughs as playthroughs

    FROM Album
    WHERE fullPlaythroughs >= 1 AND type != 'single'
    ORDER BY fullPlaythroughs desc
`

    db.all(stats, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/stats/top-artists-per-month', (req, res) => {
    let query = `
    SELECT *
    FROM (
        SELECT
            SUBSTR(Stream.timeStamp, 0, 8) as month,
            Artist.ID as artistID,
            Artist.name as artistName,
            Artist.imgSmall as imgSmall,
            count(*) as streams
        FROM Stream
        JOIN writtenBy ON writtenBy.songID = Stream.songID
        JOIN Artist ON Artist.ID = writtenBy.artistID
        GROUP BY month, writtenBy.artistID
        ORDER BY month, streams desc
    ) as z
    GROUP BY z.month
    `
    db.all(query, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });

});
app.get('/stats/bpm-histogram', (req, res) => {
    let query = `
    SELECT CAST(Song.tempo as INT) as bpm, count(*) as amount
    FROM Song
    GROUP BY bpm
    ORDER BY bpm
    `
    db.all(query, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });

});
app.get('/stats/genre-evolution', (req, res) => {
    let query = `
    SELECT
        SUBSTR(timeStamp, 0,8) as month,
        genre,
        count(genre) as streams
    FROM Stream
    JOIN writtenBy ON writtenBy.songID = Stream.songID
    JOIN genre ON Genre.artistID = writtenBy.artistID
    GROUP BY month, genre
    ORDER BY month asc, streams desc
    `



    db.all(query, [], (err, rows) => {
        if (err) throw err;

        let months = {};

        // console.log(getGeneralGenre("black metal"))
        for (let i = 0; i < rows.length; i++) {

            let genre = getGeneralGenre(rows[i].genre)

            if (!months.hasOwnProperty(rows[i].month)) {
                months[ rows[i].month ] = {};
            }
            if (!months[rows[i].month].hasOwnProperty(genre)) {
                months[ rows[i].month ][ genre ] = 0;
            }

            months[ rows[i].month ][ genre ] += rows[i].streams
        }

        res.json(months)

    });

});

app.get('/search/:search', (req, res) => {
    // search for string in titles, album names and lyrics
    // and return these songs
    let searchText = decodeURIComponent(req.params.search); // can include spaces ('post rock') and thus must be encoded and decoded to URI
    let songSearchQuery = `
    SELECT
        Song.title as title,
        Song.ID as ID,
        Album.name as 'album',
        Album.ID as 'albumID',
        CASE WHEN INSTR(Song.lyrics, '${searchText}') = 0
            THEN Song.lyrics
            ELSE SUBSTR(
                Song.lyrics,
                INSTR(Song.lyrics, '${searchText}') - 10,
                100)
        END as lyrics

    FROM Song
    JOIN Album ON Album.ID = Song.albumID

    WHERE
        title LIKE '%${searchText}%'
        OR
        album LIKE '%${searchText}%'
        OR
        lyrics LIKE '%${searchText}%'

    GROUP BY Song.ID
    ORDER BY title, album, lyrics
    LIMIT 50
    `;

    let artistSearchQuery = `
    SELECT
        Artist.ID as ID,
        Artist.imgSmall as img,
        Artist.name as artist
    FROM Artist
    WHERE Artist.name LIKE '%${searchText}%'
    ORDER BY artist
    LIMIT 50
    `;
    let results = {
        songs: [],
        artists: []
    }
    db.all(songSearchQuery, [], (err, songRows) => {
        if (err) throw err;
        results.songs = songRows;
        db.all(artistSearchQuery, [], (err, artistRows) => {
            results.artists = artistRows;
            res.json( results )
        })
    });
});





/* ---------------------------------------------*/
/* ----------- SERVER SETUP --------------------*/
/* ---------------------------------------------*/

const port = 8000;
app.listen(port, () => {
    console.log(`[ SERVER STARTED ]\nlisten at port ${port}.`)
})

// load preferences like theme and preplotted graphics
loadPreferences()
