const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');


app.use( bodyParser.json() );
app.use( express.static( path.join(__dirname, "public") ) );


// using test databse for security reasons test.db
let db = new sqlite3.Database('develop.db', (err) => {
    if (err) throw err;
    console.log('[ CONNECTED ] to spotify.db');
});

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
    let top_songs = `
        SELECT
            Song.ID as 'ID',
            Song.title as 'title',
            count(*)   as 'streams'
        FROM Stream
        JOIN Song ON Stream.songID = Song.ID
        GROUP BY title
        ORDER BY streams desc
    `;
    if ( req.query.hasOwnProperty("limit") ) {
        top_songs += '\nLIMIT ' + req.query.limit;
    }

    db.all(top_songs, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});


app.get('/artists/top', (req, res) => {
    let limit  = 20;
    let offset = 0;
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

    let top_artists = `
    SELECT
        artist.name as 'artist',
        count(timeStamp) as streams,
        artist.imgSmall as img,
        artist.ID as id
    FROM Stream
        JOIN writtenBy ON writtenBy.songID = Stream.songID
        JOIN Artist ON Artist.ID = writtenBy.artistID
    ${whereClause}
    GROUP BY artist
    ORDER BY streams desc
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
    db.all(all_artists, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows[0]);
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
app.get('/album/id/:id', (req, res) => {
    let album = `
    SELECT
        Album.ID    as id,
        Album.name  as name,
        Artist.name as artist,
        Album.releaseDate as 'releaseDate',
        Album.totaltracks as 'totalAtracks',
        Album.type,
        Album.imgBig,
        Album.imgSmall
    FROM Album
    JOIN Artist ON Artist.ID = Album.artistID
    WHERE Album.ID = '${req.params.id}'
    `;
    db.all(album, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows[0]);
    });
});
app.get('/album/top', (req, res) => {
    let limit  = 20;
    let offset = 0;
    if ( req.query.hasOwnProperty("limit") ) {
        limit = req.query.limit;
    }
    if ( req.query.hasOwnProperty("offset") ) {
        offset = req.query.offset;
    }

    let top_albums = `
        SELECT
            Album.ID as 'ID',
            Album.name as 'album',
            Artist.name as 'artist',
            albumsRanked.streams as 'streams',
            Album.imgSmall as 'img'
        FROM
        (
            SELECT
                Song.albumID as 'ID',
                count(*)     as 'streams'
            FROM Stream
            JOIN Song ON Stream.songID = Song.ID

            GROUP BY Song.albumID
            HAVING albumID NOT NULL
            ORDER BY streams desc
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


app.get('/vis/force-graph/nodes', (req, res) => {
    let node_query = `
        SELECT
            artist.ID as id,
            artist.name as 'name',
            count(timeStamp) as streams,
            artist.imgSmall as img
        FROM Stream
            JOIN writtenBy ON writtenBy.songID = Stream.songID
            JOIN Artist ON Artist.ID = writtenBy.artistID
        GROUP BY name
        ORDER BY streams desc
    `;

    db.all(node_query, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/vis/force-graph/edges', (req, res) => {
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
        a.artistID != b.artistID	-- remeove edges to same node
        AND
        a.artistID > b.artistID 	-- total order to not double each edge

    GROUP BY source, target
    HAVING weight > 0
    ORDER BY weight desc
    `;

    if ( req.query.hasOwnProperty("limit") ) {
        edge_query += '\nLIMIT ' + req.query.limit;
    }

    db.all(edge_query, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});


app.get('/times/top', (req, res) => {
    // streams per times of day
    let top_times = `
        SELECT
            substr(Stream.timeStamp, 12,4) as 'time',
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
        SUBSTR(Stream.timeStamp, 0, 8) as 'month',
        COUNT(*) as 'streams'
    FROM Stream
    GROUP BY month
    ORDER BY month
    `;
    if ( req.query.hasOwnProperty("limit") ) {
        months += '\nLIMIT ' + req.query.limit;
    }

    db.all(months, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/times/weekly', (req, res) => {
    // streams per month
    let months = `
        SELECT
            strftime('%Y|%W', Stream.timeStamp) as week,
            count(*) as 'streams'
        FROM Stream
        GROUP BY week
        ORDER BY week
    `;
    if ( req.query.hasOwnProperty("limit") ) {
        months += '\nLIMIT ' + req.query.limit;
    }

    db.all(months, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/times/yearly', (req, res) => {
    // streams per year
    let years = `
    SELECT
        SUBSTR(Stream.timeStamp, 0, 5) as 'year',
        COUNT(*) as 'streams'
    FROM Stream
    GROUP BY year
    ORDER BY year
    `;
    if ( req.query.hasOwnProperty("limit") ) {
        years += '\nLIMIT ' + req.query.limit;
    }

    db.all(years, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
    });
});
app.get('/times/daily', (req, res) => {
    // streams per day
    let days = `
    SELECT
        SUBSTR(Stream.timeStamp, 0, 11) as 'day',
        COUNT(*) as 'streams'
    FROM Stream
    GROUP BY day
    ORDER BY day
    `;
    if ( req.query.hasOwnProperty("limit") ) {
        days += '\nLIMIT ' + req.query.limit;
    }

    db.all(days, [], (err, rows)=> {
        if (err) throw err;
        res.json(rows);
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


app.get('/search/:search', (req, res) => {
    // search for string in titles, album names and lyrics
    // and return these songs
    let searchText = decodeURIComponent(req.params.search); // can include spaces ('post rock') and thus must be encoded and decoded to URI
    let songSearchQuery = `
    SELECT
        Song.title as title,
        Song.ID as ID,
        Album.name as 'album',
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