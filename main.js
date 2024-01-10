const axios = require('axios');
const fs = require('fs');

const baseURL = 'https://apicache.vudu.com/api2/';
const timeLimitPerRequestMs = 10;

//params need to be approached in a different way, this is a change that is critical to make
const params = {
  _type: 'contentSearch',
  contentEncoding: 'gzip',
  dimensionality: 'any',
  followup: 'usefulStreamableOffers',
  format: 'application/json',
  //sortBy: '-streamScore',
  count: 100,
};

const getURL = (media, offset) => {
  if (media !== 'movies' && media !== 'series') {
    throw new Error('Invalid media parameter. It must be either movies or series.');
  }

  const paramsCopy = getParamsCopy();

  if (media === 'movies') {
    paramsCopy.type = ['program'];
    paramsCopy.superType = 'movies';
    paramsCopy.includePreOrders = true;
  } else {
    paramsCopy.type = ['season'];
    paramsCopy.superType = 'tv';
  }

  paramsCopy.offset = offset;

  const queryString = Object.keys(paramsCopy)
    .map((key) => {
      const value = Array.isArray(paramsCopy[key])
        ? paramsCopy[key].map((v) => `${v}`).join(`&${key}=`)
        : encodeURIComponent(paramsCopy[key]);
      return `${encodeURIComponent(key)}=${value}`;
    })
    .join('&');

  return `${baseURL}?${queryString}`;
};

// GET request
const getData = async (url) => {
  try {
    const response = await axios.get(url);
    const data = response.data;

    // Strip the /*-secure- prefix and the */ suffix from the data
    const strippedData = data.replace('/*-secure-', '').replace('*/', '');

    return JSON.parse(strippedData);
  } catch (error) {
    handleError(error);
    throw error;
  }
};

const getDataWithDelay = (url) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const data = await getData(url);

        resolve(data);
      } catch (error) {
        reject(error);
      }
    }, timeLimitPerRequestMs);
  });
};

const getEpisodesURL = (seasonId, offset, option) => {
  if (typeof seasonId !== 'string') {
    throw new Error('Invalid seasonId parameter. It must be a string.');
  }

  const paramsCopy = getParamsCopy();
  // Merge the default parameters with the custom option
  Object.assign(paramsCopy, option);
  paramsCopy.offset = offset;
  paramsCopy.seasonId = seasonId;

  const queryString = Object.keys(paramsCopy)
    .map((key) => {
      const value = Array.isArray(paramsCopy[key])
        ? paramsCopy[key].map((v) => `${v}`).join(`&${key}=`)
        : encodeURIComponent(paramsCopy[key]);
      return `${encodeURIComponent(key)}=${(value)}`;
    })
    .join('&');
  return `${baseURL}?${queryString}`;
};


const parseMovieData = (data) => {
  if (!data || !data.content) {
    throw new Error('Invalid data. It must have the content property.');
  }

  return data.content.map((item) => {
    const releaseDate = item.releaseTime?.[0];
    const rentalCostSD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'sd')?.[0]?.offers[0]?.offer?.filter((offer) => offer.offerType[0] === 'ptr')?.[0]?.price?.[0];
    const rentalCostHD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'hdx')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'ptr')?.[0]?.price?.[0];
    const purchaseCostSD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'sd')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'pto')?.[0]?.price?.[0];
    const purchaseCostHD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'hdx')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'pto')?.[0]?.price?.[0];

    return {
      content_id: item.contentId[0],
      title: item.title[0],
      release_date: releaseDate,
      rental_cost_sd: rentalCostSD,
      rental_cost_hd: rentalCostHD,
      purchase_cost_sd: purchaseCostSD,
      purchase_cost_hd: purchaseCostHD,
    };
  });
};

const parseSeriesData = (data) => {
  if (!data || !data.content) {
    throw new Error('Invalid data. It must have the content property.');
  }


  return data.content.map((item) => {
    //const contentId = item.contentId[0];
    const seriesId = item.seriesId[0];
    //const title = item.title[0];
    const noSeasonTitle = item.title[0].substring(0, item.title[0].lastIndexOf(':'));
    const title = noSeasonTitle;
    const releaseDate = item.releaseTime?.[0];
    const rentalCostSD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'sd')?.[0]?.offers[0]?.offer?.filter((offer) => offer.offerType[0] === 'ptr')?.[0]?.price?.[0];
    const rentalCostHD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'hdx')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'ptr')?.[0]?.price?.[0];
    const purchaseCostSD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'sd')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'pto')?.[0]?.price?.[0];
    const purchaseCostHD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'hdx')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'pto')?.[0]?.price?.[0];

    return {
      content_id: seriesId,
      //series_id: seriesId,
      title,
      release_date: releaseDate,
      rental_cost_sd: rentalCostSD,
      rental_cost_hd: rentalCostHD,
      purchase_cost_sd: purchaseCostSD,
      purchase_cost_hd: purchaseCostHD,
    };
  });
};

const parseSeasonsData = (data) => {
  if (!data || !data.content) {
    throw new Error('Invalid data. It must have the content property.');
  }

  return data.content.map((item) => {
    const seasonNumber = item.seasonNumber?.[0];
    const seasonId = item.contentId[0];

    const rentalCostSD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'sd')?.[0]?.offers[0]?.offer?.filter((offer) => offer.offerType[0] === 'ptr')?.[0]?.price?.[0];
    const rentalCostHD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'hdx')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'ptr')?.[0]?.price?.[0];
    const purchaseCostSD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'sd')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'pto')?.[0]?.price?.[0];
    const purchaseCostHD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'hdx')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'pto')?.[0]?.price?.[0];

    return {
      season_number: seasonNumber,
      season_id: seasonId,
      rental_cost_sd: rentalCostSD,
      rental_cost_hd: rentalCostHD,
      purchase_cost_sd: purchaseCostSD,
      purchase_cost_hd: purchaseCostHD
    };
  });
};

const parseEpisodesData = (data) => {
  if (!data || !data.content) {
    throw new Error('Invalid data. It must have the episode property.');
  }
  return data.content.map((item) => {
    const episodeId = item.contentId[0];
    const episodeNumber = item.episodeNumberInSeason?.[0];
    const episodeTitle = item.title[0];
    const episodeReleaseDate = item.releaseTime?.[0];
    const tmsId = item.tmsId?.[0];

    const rentalCostSD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'sd')?.[0]?.offers[0]?.offer?.filter((offer) => offer.offerType[0] === 'ptr')?.[0]?.price?.[0];
    const rentalCostHD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'hdx')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'ptr')?.[0]?.price?.[0];
    const purchaseCostSD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'sd')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'pto')?.[0]?.price?.[0];
    const purchaseCostHD = item.contentVariants?.[0]?.contentVariant?.filter((variant) => variant.videoQuality[0] === 'hdx')?.[0]?.offers?.[0]?.offer?.filter((offer) => offer.offerType[0] === 'pto')?.[0]?.price?.[0];

    return {
      episode_id: episodeId,
      episode_number: episodeNumber,
      episode_title: episodeTitle,
      release_date: episodeReleaseDate,
      tms_id: tmsId,
      rental_cost_sd: rentalCostSD,
      rental_cost_hd: rentalCostHD,
      purchase_cost_sd: purchaseCostSD,
      purchase_cost_hd: purchaseCostHD
    };
  });
};

const parseDataByMedia = (media, data) => {
  let parseFunction;
  if (media === 'movies') {
    parseFunction = parseMovieData;
  } else if (media === 'series') {
    parseFunction = parseSeriesData;
  } else {
    throw new Error('Invalid media parameter. It must be either movies or series.');
  }
  return parseFunction(data);
};

const saveData = (data, outputLocation) => {
  if (!outputLocation) {
    throw new Error('Invalid output location. It must be a valid path.');
  }

  const jsonString = JSON.stringify(data, (k, v) => v === undefined ? null : v, 2);

  // Create the directory if it does not exist
  fs.mkdirSync(outputLocation, { recursive: true });
  fs.writeFileSync(outputLocation + "out.json", jsonString);
};


const handleError = (error) => {
  if (error.response) {
    console.error('Error response from the server:');
    console.error(error.response.data);
    console.error(error.response.status);
    console.error(error.response.headers);
  } else if (error.request) {
    console.error('No response from the server:');
    console.error(error.request);
  } else {
    console.error('Error in setting up the request:');
    console.error(error.message);
  }
};

// To do: handle payload parameter
const init = async (media, outputLocation) => {
  if (!media) {
    throw new Error('Invalid media parameter. It must be either movies or series.');
  }

  if (!outputLocation) {
    throw new Error('Invalid outputLocation parameter. It must be a valid path.');
  }

  // Offset value to 0, because it works by "scrolling"
  // In 1/4/2024, for movies: greatest offset was 41700 for 100 increments
  // for series: greatest offset was 16872. The last three are after offset 16892 
  let offset = 0;
  let moreBelow = true;
  let results = [];

  while (moreBelow) {
    const url = getURL(media, offset);
    console.log(url);
    const data = await getDataWithDelay(url);
    const parsedData = parseDataByMedia(media, data);
    results = results.concat(parsedData);

    if (data.moreBelow) {
      moreBelow = data.moreBelow[0] === 'true';
    } else {
      moreBelow = false;
    }

    offset += params.count;
  }

  results = results.filter(
    (item, index, array) =>
      array.findIndex((other) => other.content_id === item.content_id) === index
  );

  if (media === 'series') {
    const seriesIds = new Set();

    for (let i = 0; i < results.length; i++) {
      //const seriesId = results[i].series_id;
      const seriesId = results[i].content_id;


      if (seriesIds.has(seriesId)) {
        continue;
      }

      seriesIds.add(seriesId);
      const seasons = [];
      let seasonsOffset = 0;
      let seasonsMoreBelow = true;

      while (seasonsMoreBelow) {
        const seasonsURL = getSeasonsURL(seriesId, seasonsOffset);
        console.log("SEASONS URL: " + seasonsURL);
        const seasonsData = await getDataWithDelay(seasonsURL);
        const parsedSeasonsData = parseSeasonsData(seasonsData);
        seasons.push(...parsedSeasonsData);

        if (seasonsData.moreBelow) {
          seasonsMoreBelow = seasonsData.moreBelow[0] === 'true';
        } else {
          seasonsMoreBelow = false;
        }

        seasonsOffset += params.count;
      }

      for (let j = 0; j < seasons.length; j++) {
        const seasonId = seasons[j].season_id;
        const episodes = [];

        let episodesOffset = 0;
        let episodesMoreBelow = true;

        while (episodesMoreBelow) {
          const episodesURL = getEpisodesURL(seasonId, episodesOffset);
          console.log("EPISODES URL: " + episodesURL);
          try {
            // Try to get the episodes data
            const episodesData = await getDataWithDelay(episodesURL);
            try {
              const parsedEpisodesData = parseEpisodesData(episodesData);
              episodes.push(...parsedEpisodesData);
            } catch (error) {
              console.error(error.message);
              const newEpisodesURL = getEpisodesURL(seasonId, episodesOffset, { listType: 'useful', includePreOrders: false });
              console.log("NEW EPISODES URL: " + newEpisodesURL);
              const newEpisodesData = await getDataWithDelay(newEpisodesURL);
              const newParsedEpisodesData = parseEpisodesData(newEpisodesData);
              episodes.push(...newParsedEpisodesData);
            }
            if (episodesData.moreBelow) {
              episodesMoreBelow = episodesData.moreBelow[0] === 'true';
            } else {
              episodesMoreBelow = false;
            }
            episodesOffset += params.count;
          } catch (error) {
            console.error(error.message);
            console.log('No episodes to show for seasonId: ' + seasonId);
            break;            
          }
        }
        
        seasons[j].episodes = episodes;
      }
      results[i].seasons = seasons;
    }
  }

  saveData(results, outputLocation);
  return results;
}; 

const getParamsCopy = () => {
  const paramsCopy = { ...params };
  return paramsCopy;
};

const getSeasonsURL = (seriesId) => {
  if (typeof seriesId !== 'string') {
    throw new Error('Invalid seriesId parameter. It must be a string.');
  }

  const paramsCopy = getParamsCopy();

  paramsCopy.type = ['season'];
  paramsCopy.superType = 'tv';
  paramsCopy.includePreOrders = true;
  paramsCopy.followup = ['episodeNumberInSeason', 'seasonNumber', 'usefulStreamableOffers'];
  paramsCopy.offset = 0;
  paramsCopy.seriesId = seriesId;

  const queryString = Object.keys(paramsCopy)
    .map((key) => {
      const value = Array.isArray(paramsCopy[key])
        ? paramsCopy[key].map((v) => `${v}`).join(`&${key}=`)
        : encodeURIComponent(paramsCopy[key]);
      return `${encodeURIComponent(key)}=${value}`;
    })
    .join('&');

  return `${baseURL}?${queryString}`;
};

// Parses the command line arguments and calls the init function
const main = async () => {
  const args = process.argv.slice(2);

  console.log("Running with parameters: " + args);

  if (args.length < 2) {
    throw new Error('Invalid arguments. You must provide the media and output parameters.');
  }

  const media = JSON.parse(args[0]).media;
  const outputLocation = args[1];

  const results = await init(media, outputLocation);

  console.log(results);
};

main();
