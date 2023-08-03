from database import Database
from datetime import datetime as dt, timedelta as tdelta



class Artist:
    def __init__(self, artist_id: str, top_percent: int = 10) -> None:
        self.artist_id: str = artist_id
        self.time_deltas: list = []
        self.median_delta: tdelta
        self.top_days: list
        self.top_days_query: str = f"""
            SELECT
                z.day as time,
                z.streams
            FROM (
                SELECT
                    substr( Stream.timeStamp, 0, 11) AS 'day',
                    count(*) as streams

                FROM Stream
                JOIN writtenBy ON writtenBy.songID = Stream.songID
                JOIN Artist ON Artist.ID = writtenBy.artistID

                WHERE Artist.ID = '{self.artist_id}'
                GROUP BY day, Artist.ID
                ORDER BY streams desc
                LIMIT (
                    SELECT CAST(count(*) * 0.1 AS INT) as s
                    FROM (
                        SELECT
                            count(*) as streams
                        FROM Stream
                        JOIN writtenBy ON writtenBy.songID = Stream.songID
                        JOIN Artist ON Artist.ID = writtenBy.artistID
                        WHERE Artist.ID = '{self.artist_id}'
                        GROUP BY substr( Stream.timeStamp, 0, 11), Artist.ID
                        ORDER BY substr( Stream.timeStamp, 0, 11)
                    )
                )
            ) as z
            ORDER BY z.day
        """

    def _retrieve_top_days(self) -> None:
        """
        PRIVATE (should be called from self.predict_next_peak)
        call database for the top 10% of days concerning streaming by this artist
        save results in self.time_deltas list
        """

        self.top_days = db.get_all( self.top_days_query )
        self.top_days.sort(key = lambda x: x['time'])

        # calculate all timedeltas and append to a list
        for i, line in enumerate(self.top_days):
            if i == 0:
                continue

            prev_date = dt.strptime( self.top_days[ i - 1 ]['time'], "%Y-%m-%d" )
            curr_date = dt.strptime( line['time'], "%Y-%m-%d" )
            self.time_deltas.append(curr_date - prev_date)

    def _calculate_median(self) -> tdelta :
        """
        PRIVATE (should be called from self.predict_next_peak)
        calculate the median timedelta between the timedeltas in self.time_deltas
        sets this median to self.median_delta
        and returns it
        """
        deltas_asc = sorted(self.time_deltas)

        n: int = len(deltas_asc)

        if n < 3:
            raise ValueError


        if n % 2 == 0:
            # even number of values
            self.median_delta = (deltas_asc[ int(n/2) ] + deltas_asc[ int(n/2) + 1]) * 0.5
        else:
            # odd number of values
            self.median_delta = deltas_asc[ int(n/2) + 1 ]


        return self.median_delta

    def predict_next_peak(self) -> dt:
        """
        uses median timedelta to calculate the next expected "peak" of the artist
        by adding the delta to the date of the last peak
        returns the date
        """
        self._retrieve_top_days()
        try:
            self._calculate_median()
        except ValueError:
            raise ValueError

        last_date = dt.strptime( self.top_days[ -1 ]['time'], "%Y-%m-%d" )

        return last_date + self.median_delta


class Recommendation:
    def __init__(self, offset: int = 0, artist_number: int = 100) -> None:
        self.offset: int = offset
        self.artist_number: int = artist_number
        self.top_artists: list
        self.top_artists_query: str = f"""
            SELECT
                artist.name as 'artist',
                count(timeStamp) as streams,
                artist.ID as id
            FROM Stream
                JOIN writtenBy ON writtenBy.songID = Stream.songID
                JOIN Artist ON Artist.ID = writtenBy.artistID
                JOIN Song ON Song.ID = writtenBy.songID
            GROUP BY artist
            ORDER BY streams desc
            LIMIT {artist_number}
            OFFSET {offset}
        """
        self.predictions: list = []

    def _load_top_artists(self) -> None:
        self.top_artists = db.get_all( self.top_artists_query )

    def _all_predictions(self) -> None:
        for artist_line in self.top_artists:
            artist = Artist( artist_line['id'], top_percent=5 )

            try:
                prediction = artist.predict_next_peak()
            except ValueError:
                continue

            self.predictions.append({
                "artist": artist_line["artist"],
                "prediction": prediction
            })

    def save_predictions(self) -> None:
        self._load_top_artists()
        self._all_predictions()

        self.predictions.sort(key=lambda p: p['prediction'])


if __name__ == '__main__':
    db: Database = Database('develop.db')

    recommendendation = Recommendation()
    recommendendation.save_predictions()

    for p in recommendendation.predictions:
        print(p)

