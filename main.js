const axios = require('axios');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const baseURL = 'https://apicache.vudu.com/api2/';
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

  if (media === 'movies') {
    params.type = ['program'];
    params.superType = 'movies';
    params.includePreOrders = true;
  } else {
    params.type = ['season'];
    params.superType = 'tv';
  }

  params.offset = offset;

  const queryString = Object.keys(params)
    .map((key) => {
      // If the parameter value is an array, joins with commas, but this needs to be corrected because join with &key= is the way it works for this api
      const value = Array.isArray(params[key])
        ? params[key].join(',')
        : params[key];
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
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

// Parse the response and extract the content fields
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

    // the following could be useful because sometimes the best quality available is sd
    //const bestQuality = item.bestDashVideoQuality[0];

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

// Parse the response data and extract the series data fields
const parseSeriesData = (data) => {
  if (!data || !data.content) {
    throw new Error('Invalid data. It must have the content property.');
  }

  return data.content.map((item) => {
    const contentId = item.contentId[0];
    const title = item.title[0];
    const releaseDate = item.releaseTime[0];

    const seasons = item.contentVariants[0].contentVariant[0].seasons?.[0].season.map((season) => {
      const seasonId = season.seasonId[0];
      const seasonNumber = season.seasonId[0].split('-')[1];

      const episodes = season.episodes[0].episode.map((episode) => {
        const episodeId = episode.episodeId[0];
        const episodeNumber = episode.episodeId[0].split('-')[2];
        const episodeTitle = episode.title[0];
        const episodeReleaseDate = episode.releaseTime[0];

        const rentalCostSD = episode.offers[0].offer.filter((offer) => offer.offerType[0] === 'ptr' && offer.videoQuality[0] === 'sd')[0].price[0];
        const rentalCostHD = episode.offers[0].offer.filter((offer) => offer.offerType[0] === 'ptr' && offer.videoQuality[0] === 'hdx')[0].price[0];
        const purchaseCostSD = episode.offers[0].offer.filter((offer) => offer.offerType[0] === 'pto' && offer.videoQuality[0] === 'sd')[0].price[0];
        const purchaseCostHD = episode.offers[0].offer.filter((offer) => offer.offerType[0] === 'pto' && offer.videoQuality[0] === 'hdx')[0].price[0];

        return {
          episode_id: episodeId,
          episode_number: episodeNumber,
          episode_title: episodeTitle,
          episode_release_date: episodeReleaseDate,
          rental_cost_sd: rentalCostSD,
          rental_cost_hd: rentalCostHD,
          purchase_cost_sd: purchaseCostSD,
          purchase_cost_hd: purchaseCostHD
        };
      });

      return {
        season_id: seasonId,
        season_number: seasonNumber,
        episodes
      };
    });

    return {
      content_id: contentId,
      title,
      release_date: releaseDate,
      seasons
    };
  });
};

// Higher-order function that takes a media parameter and a data parameter
// and returns the result of calling either parseMovieData or parseSeriesData on the data
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

  const jsonString = JSON.stringify(data, null, 2);

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

const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests. Please try again later.',
});

// To do: handle payload parameter
//const init = async (media, payload, outputLocation) => {
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
  let offset = 16892;
  let moreBelow = true;
  let results = [];

  while (moreBelow) {
    const url = getURL(media, offset);
    console.log(url);
    const data = await getData(url);
    const parsedData = parseDataByMedia(media, data);
    results = results.concat(parsedData);

    if (data.moreBelow) {
      moreBelow = data.moreBelow[0] === 'true';
    } else {
      moreBelow = false;
    }

    offset += params.count;
  }

  // Remove any duplicates
  results = results.filter(
    (item, index, array) =>
      array.findIndex((other) => other.content_id === item.content_id) === index
  );

  saveData(results, outputLocation);
  return results;
};

// Parses the command line arguments and calls the init function
const main = async () => {
  const args = process.argv.slice(2);

  console.log("Running with parameters: " + args);

  if (args.length < 2) {
    throw new Error('Invalid arguments. You must provide the media and outputLocation parameters.');
  }

  const media = JSON.parse(args[0]).media;
  const outputLocation = args[1];

  const results = await init(media, outputLocation);

  console.log(results);
};

main();
