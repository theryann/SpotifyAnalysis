
window.onload = async () => {
    const loader = document.querySelector('.loader');
    const fieldSongImg = document.getElementById('item-info__img')
    const fieldSongName = document.getElementById('item-info__name')
    const fieldSongStreams = document.getElementById('item-info__streams')
    const fieldLyrics = document.getElementById('lyrics-unfold')
    const wrapper = document.getElementById('wrapper')

    const urlParams = new URLSearchParams(window.location.search);
    const songID = urlParams.get('song-id');

    let res = await fetch(`/songs/id/${songID}`)
    let songInfo = await res.json();

    fieldSongImg.src = songInfo.imgBig;
    fieldSongName.innerText = songInfo.title;
    fieldSongStreams.innerText = songInfo.streams;

    // lyrics
    let lyrics = document.createElement('p')
    lyrics.innerText = songInfo.lyrics
    fieldLyrics.appendChild(lyrics)


    loader.remove()

}