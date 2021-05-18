const axios = require('axios');
const Logger = require('ps-chronicle');
const logger = new Logger('axios-client.js', 'json', 'debug');
async function makeRequest(method, url, headers, data, timeout) {
    let response;
    await axios({
        method,
        url,
        headers,
        data,
        timeout
    }).then((res) => {
        response = res
    }).catch((error) => {
        if (error.response) {
            response = {
                statusCode: error.response.status,
                body: JSON.stringify(error.response.data)
            }
        } else if (error.request) {
            response = {
                statusCode: 504,
                body: 'Request timed out'
            }
        } else {
            response = {
                statusCode: 500,
                body: error.message
            } 
        }
    });
    return response;
}

module.exports = {
    makeRequest
}