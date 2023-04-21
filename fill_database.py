from database import Database
import json
import csv

def clear_database():
    db: Database = Database("develop.db")
    db.clear_all_tables()

def move_songs():
    with open('song_database.json', 'r', encoding='utf-8') as fd:
        song_db = json.load(fd)

    db: Database = Database("develop.db")

    print("move songs...")
    for song_id in song_db:
        #####  parse data #####
        if type(song_db[song_id]) != dict:
            print(song_db[song_id], 'not worthy')
            continue

        song = song_db[song_id]

        # song data
        title = song["titel"]
        album = song["album"]
        duration = int(song["duration"])
        popularity = int(song["popularity"])
        explicit = 0 if song["is_explicit"] == "False" else 1
        lyrics = song["lyrics"] if 'lyrics' in song else ''
        key           = song["audio-features"]["key"] if "audio-features" in song else ''
        timeSignature = song["audio-features"]["time_signature"] if "audio-features" in song else ''
        mode          = song["audio-features"]["mode"] if "audio-features" in song else ''
        loudness      = song["audio-features"]["loudness"] if "audio-features" in song else ''
        tempo         = song["audio-features"]["tempo"] if "audio-features" in song else ''
        energy        = song["audio-features"]["energy"] if "audio-features" in song else ''

        # artist data
        if type(song["artist"][0]) == dict:
            # print(song["artist"])
            artists = [ a["id"] for a in song["artist"]]


        elif type(song["artist"][0]) == str:
            artists = song["artist"]

        ###### [   Song    ] ######
        db.insert_row(
            table = "Song",
            row = {
                "ID": song_id,
                "title": title,
                "duration": duration,
                "popularity": popularity,
                "explicit": explicit,
                "key": key,
                "timeSignature": timeSignature,
                "mode": mode,
                "loudness": loudness,
                "tempo": tempo,
                "energy": energy,
                "lyrics": lyrics
            }
        )

def move_artists():
    with open('song_database.json', 'r', encoding='utf-8') as fd:
        song_db = json.load(fd)

    db: Database = Database("develop.db")

    used_artist_ids = []
    print("move artists...")
    # iterate over all artists that worked on this song
    for song_id in song_db:
        for artist in song_db[song_id]["artist"]:
            #####  parse data #####
            if type(artist) != dict:
                print(artist, 'not worthy')
                continue

            artist_id = artist["id"]

            ###### [ writtenBy  ] ######
            db.insert_row(
                table = "writtenBy",
                row = {
                    "songID": song_id,
                    "artistID": artist_id
                }
            )

            # if artist and genre have been entered before there's no need to enter them again. the written by beforehand needs to be entered though
            if artist_id in used_artist_ids:
                continue


            name = artist["name"].replace("'", "''")
            popularity = artist["popularity"]
            genres = artist["genres"]

            img_big = ""
            img_small = ""
            if artist["images"] != []:
                img_big = artist["images"][0]["url"]
                img_small = artist["images"][-1]["url"]


            #### insert data #####
            ###### [   Artist    ] ######
            db.insert_row(
                table = "Artist",
                row = {
                    "ID": artist_id,
                    "name": name,
                    "popularity": popularity,
                    "imgBig": img_big,
                    "imgSmall": img_small
                }
            )
            ###### [   Genre    ] ######
            for genre in genres:
                db.insert_row(
                    table = "Genre",
                    row = {
                        "artistID": artist_id,
                        "genre" : genre
                    }
                )
            used_artist_ids.append(artist_id)

def move_history():
    print("move history...")
    # read data
    history_data = []
    with open("history.csv", "r", encoding="utf-8") as fd:
        reader = csv.reader(fd)
        for line in reader:
            history_data.append(line)

    # process data
    db: Database = Database("develop.db")

    for row in history_data:
        time_stamp = row[0]
        song_id    = row[1]

        db.insert_row(
            table = "Stream",
            row = {
                "timeStamp": time_stamp,
                "songID": song_id
            }
        )



if __name__ == "__main__":
    clear_database()
    move_songs()
    move_artists()
    move_history()