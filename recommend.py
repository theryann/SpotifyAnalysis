from database import Database
from datetime import datetime as dt, timedelta as tdelta

db = Database('develop.db')

query = """
SELECT
	strftime('%Y|%W', Stream.timeStamp) as time,
	count(*) as 'streams'
FROM Stream
JOIN writtenBy ON Stream.songID = writtenBy.songID
WHERE writtenBy.artistID = '0kD8IT1CzF7js2XKM9lLLa'
GROUP BY time
ORDER BY streams desc
LIMIT (
	SELECT CAST(count(*) * 0.1 as INTEGER) as 'streams'
	FROM Stream
	JOIN writtenBy ON Stream.songID = writtenBy.songID
	WHERE writtenBy.artistID = '0kD8IT1CzF7js2XKM9lLLa'
	GROUP BY strftime('%Y|%W', Stream.timeStamp)
	ORDER BY streams desc
)
"""
results: list = db.get_all(query)
results.sort(key = lambda x: x['time'])

time_deltas: list = []

# calculate all timedeltas and append to a list
for i, line in enumerate(results):
    if i == 0:
        continue
    prev_year, prev_week = results[ i - 1 ]['time'].split('|')
    curr_year, curr_week = line['time'].split('|')

    prev_date = dt.fromisocalendar(int(prev_year), int(prev_week), 1)
    curr_date = dt.fromisocalendar(int(curr_year), int(curr_week), 1)
    time_deltas.append(curr_date - prev_date)

# calculate median timedelta
time_deltas.sort()
median: tdelta

if ( n:= len(time_deltas) ) % 2 == 0:
    # even number of values
    median = (time_deltas[ n/2 ] + time_deltas[ n/2 + 1]) * 0.5
else:
    # odd number of values
    median = time_deltas[ int(n/2) + 1 ]

# calculate next expected
print(results)

last_year, last_week = results[-1]['time'].split('|')
last_date = dt.fromisocalendar(int(last_year), int(last_week), 1)
print(last_date + median)
