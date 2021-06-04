const Logger = require('ps-chronicle');
const logger = new Logger('processor.js','json','debug');
const AWS = require('aws-sdk');
const csv = require('csvtojson');
const s3 = new AWS.S3();
const config = require('./config');
const axiosUtil = require('../layers/axios-client');

async function processCSV(event) {
    let response = {};
    try {
        let bucketName = event.Records[0].s3.bucket.name;
        let fileName = event.Records[0].s3.object.key;
        let params = {
            Bucket: bucketName,
            Key: fileName
        }
        const stream = s3.getObject(params).createReadStream();
        const json = await csv().fromStream(stream);
        logger.log('debug', 'csv-to-json', json);
        if(json.length > 0) {
            let headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
            let loginAPI = `https://${config.credentials.egainServer}/system/ws/v12/authentication/user/login?forceLogin=yes`
            let body = {
                userName: config.credentials.userName,
                password: config.credentials.password
            }
            let authentication = await axiosUtil.makeRequest('post', loginAPI, headers, body, 5000);
            if ('status' in authentication && authentication.status === 204) {
                let session = authentication.headers['x-egain-session'];
                let headers = {
                    'x-egain-session':session,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
                let createCustomerAPI = `https://${config.credentials.egainServer}/system/ws/v12/interaction/customer`
                let count = 0;
                let failArray = [];
                await Promise.all(json.map(async(eachContact) => {
                    logger.log('debug', 'json', eachContact);
                    let requestBody = {
                        "type": {
                            "value": "individual"
                        },
                        "contactPersons": {
                            "contactPerson": [
                                {
                                    "salutation": eachContact.Salutation,
                                    "firstName": eachContact.FirstName,
                                    "lastName": eachContact.LastName,
                                    "gender": {
                                        "value": eachContact.Gender
                                    },
                                    "jobTitle": eachContact.JobTitle,
                                    "contactPoints": {
                                        "contactPoint": [
                                            {
                                                "type": {
                                                    "value": "phone",
                                                    "phone": {
                                                        "type": {
                                                            "value": "home"
                                                        },
                                                        "phoneNo": eachContact.PhoneNo,
                                                        "countryCode": eachContact.CountryCode
                                                        }
                                                    },
                                                "priority": {
                                                    "value": "high"
                                                }
                                            },
                                            {
                                                "type": {
                                                    "value": "email",
                                                    "email": {
                                                        "emailAddress": eachContact.EmailAddress
                                                    }
                                                },
                                                "priority": {
                                                    "value": "high"
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                    let customer = await axiosUtil.makeRequest('post', createCustomerAPI, headers, requestBody, 20000);
                    if('status' in customer && customer.status === 201){
                        count = count + 1;
                        logger.log('debug', 'count', count);
                    } else {
                        let name = `${eachContact.FirstName},${eachContact.LastName}`;
                        failArray.push(name);
                        logger.log('debug', 'failArray', failArray);
                    }  
                }))
                if(json.length === count) {
                    response = {
                        statusCode: 201,
                        body: 'All contacts are created successfully'
                    }
                    logger.log('debug', 'final success', response);
                } else {
                    response = {
                        statusCode: 500,
                        body: `The following contacts have not been created ${JSON.stringify(failArray)}` 
                    }
                    logger.log('debug', 'final error', response);
                }
            } else {
                response = authentication;
            }
        } else {
            response = {
                statusCode: 400,
                body: 'Bad request. Empty or corrputed CSV file'
            }
        }
    } catch(err) {
        response = {
            statusCode: 500,
            body: error.stack
        }
    }
    return response;
}

module.exports = {
    processCSV
}
