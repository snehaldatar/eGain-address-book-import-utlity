const processor = require('./processor');
const Logger = require('ps-chronicle');
const logger = new Logger('index.js', 'json', 'debug');

exports.handler = async (event) => {
    let response;
    logger.log('debug', 'event', event);
    let CSVProcessor = await processor.processCSV(event);
    response = {
        statusCode: CSVProcessor.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: CSVProcessor.body
    }
    logger.log('debug', 'response', response);
    return response;
}
