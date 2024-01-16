exports.Ingest = (input, mediaType, params = {}) => {
  if (!Array.isArray(input) || !input.length) {
    throw new Error("Invalid input");
  }
  if (mediaType !== "series" && mediaType !== "movies") {
    throw new Error("Invalid mediaType");
  }

  let output = "";

  for (let item of input) {
    let outputItem = {};

    if (mediaType === "series") {
      for (let season of item.seasons) {
        for (let episode of season.episodes) {
          outputItem.tv_show_tmdb_id = item?.tmdb_id;
          outputItem.imdb_id = item?.imdb_id;
          outputItem.season_episode_tmdb_id = episode?.episode_id;
          outputItem.season = season?.season_number;
          outputItem.episode = episode?.episode_number;
          outputItem.tv_show_name = item?.title;
          outputItem.tv_show_episode_name = episode?.episode_title;
          outputItem.release_date = episode?.release_date;
          outputItem.credits = episode?.credits;
          outputItem.source_id = item?.source_id;
          outputItem.origin_source = item?.origin_source;
          outputItem.region_id = item?.region_id;
          outputItem.rental_cost_sd = episode?.rental_cost_sd;
          outputItem.rental_cost_hd = episode?.rental_cost_hd;
          outputItem.purchase_cost_sd = episode?.purchase_cost_sd;
          outputItem.purchase_cost_hd = episode?.purchase_cost_hd;

          outputItem.A = `vuduapp://play?contentId=${episode.episode_id}`; // deeplink for Android
          outputItem.F = `firetvapp://play?contentId=${episode.episode_id}`; // deeplink for FireTV
          outputItem.I = `https://www.vudu.com/content/movies/play/${episode.episode_id}`; // deeplink for iOS
          outputItem.L = ""; // deeplink for LG TV (WebOS)
          outputItem.N = `vuduapp://play?contentId=${episode.episode_id}`; // deeplink for Android TV
          outputItem.R = ""; // deeplink for Roku
          outputItem.S = ""; // deeplink for Samsung TV (TyzenOS)
          outputItem.T = ""; // deeplink for other devices
          outputItem.W = `https://www.vudu.com/content/movies/play/${episode.episode_id}`; // deeplink for Web

          let itemString = JSON.stringify(outputItem);

          itemString = itemString.replace(/,$/, "");

          itemString += "\n";

          output += itemString;
        }
      }
    } else {
      outputItem.tmdb_id = item?.tmdb_id;
      outputItem.imdb_id = item?.imdb_id;
      outputItem.movie_name = item?.title;
      outputItem.release_date = item?.release_date;
      outputItem.credits = item?.credits;
      outputItem.source_id = item?.source_id;
      outputItem.origin_source = item?.origin_source;
      outputItem.region_id = item?.region_id;
      outputItem.rental_cost_sd = item?.rental_cost_sd;
      outputItem.rental_cost_hd = item?.rental_cost_hd;
      outputItem.purchase_cost_sd = item?.purchase_cost_sd;
      outputItem.purchase_cost_hd = item?.purchase_cost_hd;

      outputItem.A = `vuduapp://play?contentId=${item.content_id}`; // deeplink for Android
      outputItem.F = `firetvapp://play?contentId=${item.content_id}`; // deeplink for FireTV
      outputItem.I = `https://www.vudu.com/content/movies/play/${item.content_id}`; // deeplink for iOS
      outputItem.L = ""; // deeplink for LG TV (WebOS)
      outputItem.N = `vuduapp://play?contentId=${item.content_id}`; // deeplink for Android TV
      outputItem.R = ""; // deeplink for Roku
      outputItem.S = ""; // deeplink for Samsung TV (TyzenOS)
      outputItem.T = ""; // deeplink for other devices
      outputItem.W = `https://www.vudu.com/content/movies/play/${item.content_id}`; // deeplink for Web

      let itemString = JSON.stringify(outputItem);
      itemString = itemString.replace(/,$/, "");

      itemString += "\n";

      output += itemString;
    }
  }

  return output;
}
