const axios = require('axios');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const baseURL = 'https://apicache.vudu.com/api2/';
const params = {
  _type: 'contentSearch',
  contentEncoding: 'gzip',
  dimensionality: 'any',
  format: 'application/json',
  responseSubset: 'micro',
  sortBy: '-streamScore',
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
      // If the parameter value is an array, joins with commas, but changing to &key= would be better
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

// Parse the response data and extract the title and contentId fields
const parseData = (data) => {
  if (!data || !data.content) {
    throw new Error('Invalid data. It must have the content property.');
  }

  return data.content.map((item) => {
    return {
      title: item.title[0],
      contentId: item.contentId[0],
    };
  });
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
  // In 1/4/2024, greatest offset was 41700 for 100 increments
  let offset = 0;
  let moreBelow = true;
  let results = [];

  while (moreBelow) {
    const url = getURL(media, offset);
    console.log(url);
    const data = await getData(url);
    const parsedData = parseData(data);
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
      array.findIndex((other) => other.contentId === item.contentId) === index
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
