
const { Command } = require("commander");


const  ingestor  = require("./vudu_ingestor_scrape_node.js");


const { mkdirSync, writeFileSync } = require("fs");


const program = new Command();


program
  .option("-i, --input <file>", "input file")
  .option("-m, --mediaType <type>", "media type (series or movies)")
  .option("-o, --output <dir>", "output directory");


program.parse(process.argv);


const options = program.opts();


if (!options.input) {
  console.error("Missing input file");
  process.exit(1);
}
if (!options.mediaType) {
  console.error("Missing media type");
  process.exit(1);
}
if (!options.output) {
  console.error("Missing output directory");
  process.exit(1);
}


const input = require(options.input);


const output = ingestor.Ingest(input, options.mediaType, null);

//console.log(output);

const outputFile = options.output + "ingestor.json";

mkdirSync(options.output, { recursive: true });


writeFileSync(outputFile, output);


console.log("Output written to " + outputFile);
