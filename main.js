const vudu_scraper = require('./vudu_scrape_node');

const main = async () => {
  const args = process.argv.slice(2);
  console.log('Running with parameters: ', args);

  if (args.length < 2) {
    throw new Error('Invalid arguments. You must provide the media and output parameters.');
  }

  const media = JSON.parse(args[0]).media;
  const outputLocation = args[2];
  const payload = args[1] || '';
  const results = await vudu_scraper.Init(media, payload, outputLocation);

  console.log(results);
};

main();
