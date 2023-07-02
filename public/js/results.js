function markKeyword(text, keyword) {
    text = text.toLowerCase();
    text = text.replaceAll('\\n', '');

    if (text.length > 100) {
        let index = text.indexOf(keyword);
        text = text.slice(index, index + 100)
    }

    text = text.replaceAll(keyword, `<em class="search-highlight">${keyword}</em>`)
    return text
}

window.onload = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const keyword = urlParams.get('keyword-search');
    const resuts = document.querySelector("#wrapper");
    const resultText = document.getElementById("keyword-search-result-text")
    const sectionArtists = document.getElementById("section-artists")
    const sectionSongs = document.getElementById("section-songs")

    if (keyword.length == 0) {
        return
    }

    let loader = document.createElement('div');
    loader.classList = 'loader';
    resuts.appendChild(loader);

    let res = await fetch(`/search/${keyword}`);
    let searchResults = await res.json();
    loader.remove();
    resultText.innerText = `${searchResults.artists.length + searchResults.songs.length} results found for: "${keyword}"`


    searchResults.songs.forEach(song => {
        let resultArticle = document.createElement("article")
        resultArticle.classList = 'search-result';

        let resultTitle = document.createElement("div")
        resultTitle.classList = 'search-result__title';
        resultTitle.innerHTML = markKeyword(song.title, keyword);

        let resultAlbum = document.createElement("div")
        resultAlbum.classList = 'search-result__album';
        resultAlbum.innerHTML = "album: " +  markKeyword(song.album, keyword);

        let resultLyrics = document.createElement("div")
        resultLyrics.classList = 'search-result__lyrics';
        resultLyrics.innerHTML = markKeyword(song.lyrics, keyword);

        resultArticle.appendChild(resultTitle)
        resultArticle.appendChild(resultAlbum)
        if (song.lyrics !== "%not available%" && song.lyrics.length > 0) {
            resultArticle.appendChild(resultLyrics)
        }
        sectionSongs.appendChild(resultArticle);

    });

    searchResults.artists.forEach(artist => {
        let resultArticle = document.createElement("article")
        resultArticle.classList = 'search-result';

        let artistImg = document.createElement("img")
        artistImg.classList = 'search-result__img';
        artistImg.src = artist.img;

        let resultArtist = document.createElement("a")
        resultArtist.href = `/artist.html?artist-id=${artist.ID}`
        resultArtist.classList = 'search-result__title';
        resultArtist.innerHTML = markKeyword(artist.artist, keyword);

        resultArticle.appendChild(artistImg)
        resultArticle.appendChild(resultArtist)
        sectionArtists.appendChild(resultArticle);

    });

}