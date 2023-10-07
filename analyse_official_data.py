import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd

import sqlite3


# read official data
dfs = []
for i in range(3):
    data = pd.read_json(f'official_data/Kontodaten/StreamingHistory{i}.json')
    dfs.append(data)

df = pd.concat(dfs, ignore_index=True)

# read database data
ctx = sqlite3.connect('develop.db')
db_df = pd.read_sql_query("""
    SELECT Artist.name as artistName, Song.title as trackName, Song.duration
    FROM Song
    JOIN Album ON Album.ID = Song.albumID
    JOIN Artist ON Artist.ID = Album.artistID
""", ctx)

# order

merged = df.merge(db_df, on=['artistName', 'trackName'])


merged['perc'] = merged['msPlayed'] / merged['duration']

pd.set_option('display.max_rows', None)
# print(merged)
print(merged.query('msPlayed > 10000')['perc'].mean(), merged['msPlayed'].median(), merged['duration'].median())


# sns.scatterplot(data=merged, x='duration', y='msPlayed', hue='blue')
# sns.boxplot(data=merged, x='duration' )


# plt.show()