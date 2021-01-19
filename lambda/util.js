const AWS = require('aws-sdk');

const s3SigV4Client = new AWS.S3({
    signatureVersion: 'v4',
    region: process.env.S3_PERSISTENCE_REGION
});

const getS3PreSignedUrl = (s3ObjectKey) => {    
    const bucketName = process.env.S3_PERSISTENCE_BUCKET;
    const s3PreSignedUrl = s3SigV4Client.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: s3ObjectKey,
        Expires: 60*1 // the Expires is capped for 1 minute
    });
    console.log(`Util.s3PreSignedUrl: ${s3ObjectKey} URL ${s3PreSignedUrl}`);
    return s3PreSignedUrl;

};

const getPersistenceAdapter = (tableName) => {
    const isAlexaHosted = () => process.env.S3_PERSISTENCE_BUCKET;
    if (isAlexaHosted()) {
        const {S3PersistenceAdapter} = require('ask-sdk-s3-persistence-adapter');
        return new S3PersistenceAdapter({bucketName: process.env.S3_PERSISTENCE_BUCKET})
    }
    const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
    return new DynamoDbPersistenceAdapter({tableName, createTable: true})
};
    
const createReminder = (requestMoment, scheduledMoment, timezone, locale, message) => (
    {
        requestTime: requestMoment.format('YYYY-MM-DDTHH:mm:00.000'),
        trigger: {
            type: 'SCHEDULED_ABSOLUTE',
            scheduledTime: scheduledMoment.format('YYYY-MM-DDTHH:mm:00.000'),
            timeZoneId: timezone
        },
        alertInfo: {
            spokenInfo: {
                content: [{
                    locale,
                    text: message
                }]
            }
        },
        pushNotification: {
            status: 'ENABLED'
        }
    }
);

const callDirectiveService = (handlerInput, msg) => {
    const {requestEnvelope, serviceClientFactory} = handlerInput;
    const directiveServiceClient = serviceClientFactory.getDirectiveServiceClient();
    const requestId = requestEnvelope.request.requestId;
    const{apiEndpoint, apiAccessToken} = requestEnvelope.context.System;
    // build the progressive response directive
    const directive = {
        header: {
            requestId
        },
        directive: {
            type: 'VoicePlayer.Speak',
            speech: msg
        }
    };
    // send directive
    return directiveServiceClient.enqueue(directive, apiEndpoint, apiAccessToken);
};

module.exports =  {
    getS3PreSignedUrl, 
    getPersistenceAdapter,
    createReminder,
    callDirectiveService
}