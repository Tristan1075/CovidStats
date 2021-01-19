/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const moment = require('moment-timezone');
const axios = require('axios');

const util = require('./util');
const interceptors = require('./interceptors');
const logic = require('./logic');
const constants = require('./constants');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
   async handle(handlerInput) {
        const {t, attributesManager} = handlerInput;
        const res = await axios.get(`https://api.covid19api.com/summary`);
        const summary = res.data.Global;
        return handlerInput.responseBuilder.speak(t('WELCOME_MSG', {
            newConfirmed: summary.NewConfirmed,
            newDeaths: summary.NewDeaths
        }))
        .reprompt()
        .getResponse();
    }
};

const WorldStatsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'WorldStatsIntent';
    },
    async handle(handlerInput) {
        const {t, attributesManager, responseBuilder} = handlerInput;
        const res = await axios.get(`https://api.covid19api.com/summary`);
        const summary = res.data.Global;
        return responseBuilder.speak(t('WORLD_STATS', {
            newConfirmed: summary.NewConfirmed,
            newDeaths: summary.NewDeaths
        }))
        .reprompt()
        .getResponse();
    }
}

const TopCountryIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'TopCountryIntent';
    },
    async handle(handlerInput) {
        const {t, attributesManager, responseBuilder} = handlerInput;
        const res = await axios.get(`https://api.covid19api.com/summary`);
        const countries = res.data.Countries;
        const firstCountry = countries.reduce((prev, current) => (prev.TotalDeaths > current.TotalDeaths) ? prev : current)
        return responseBuilder.speak(t('TOP_COUNTRY', {
            country: firstCountry.Country,
            totalDeaths: firstCountry.TotalDeaths
        }))
        .reprompt()
        .getResponse();
    }
}


const CountryCovidIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CountryCovidIntent';
    },
    async handle(handlerInput) {
        const {t} = handlerInput; 
        const countrySlot = handlerInput.requestEnvelope.request.intent.slots.pays.value;
        const res = await axios.get(`https://api.covid19api.com/total/country/${countrySlot}`);
        const country = res.data;
        const today = country[country.length - 1];
        const yesterday = country[country.length - 2];
        const speakOutput = t('COUNTRY_STATS', {
            country: today.Country,
            active: today.Active - yesterday.Active,
            deaths: today.Deaths - yesterday.Deaths
        });
        return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
    }
}

const OwnCountryIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'OwnCountryIntent';
    },
    async handle(handlerInput) {
        let speakOutput = "";
        const {t, attributesManager, responseBuilder} = handlerInput; 
        const sessionAttributes = attributesManager.getSessionAttributes();
        if(sessionAttributes["pays"]){
            const res = await axios.get(`https://api.covid19api.com/total/country/${sessionAttributes["pays"]}`);
            const country = res.data
            const today = country[country.length-1];
            const yesterday = country[country.length - 2];
            const speakOutput = t('COUNTRY_STATS', {
                country: today.Country,
                active: today.Active - yesterday.Active,
                deaths: today.Deaths - yesterday.Deaths
            });
            return responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
        } else {
            speakOutput = t('NO_COUNTRY_SAVED');
            return responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
        }
    }
}

const AddOwnCountryIntentHandler = {
     canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddOwnCountryIntent';
    },
    async handle(handlerInput) {
        const {t, attributesManager, responseBuilder, requestEnvelope} = handlerInput; 
        const sessionAttributes = attributesManager.getSessionAttributes();
        const pays = Alexa.getSlotValue(requestEnvelope, 'pays');
        sessionAttributes['pays'] = pays;
        const res = await axios.get(`https://api.covid19api.com/total/country/${pays}`);
        const country = res.data
        const today = country[country.length-1];
        const yesterday = country[country.length - 2];
        const speakOutput = t('ADD_COUNTRY_STATS', {
            country: pays,
            active: today.Active - yesterday.Active,
            deaths: today.Deaths - yesterday.Deaths
        });
    return responseBuilder
        .speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
    }  
}

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = handlerInput.t('HELP_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const {t, attributesManager} = handlerInput
        const sessionAttributes = attributesManager.getSessionAttributes();
        const name = sessionAttributes['name']

        const speakOutput = t('GOODBYE_MSG', {name});

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = handlerInput.t('FALLBACK_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = handlerInput.t('ERROR_MSG');
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        CountryCovidIntentHandler,
        WorldStatsIntentHandler,
        AddOwnCountryIntentHandler,
        OwnCountryIntentHandler,
        TopCountryIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .addRequestInterceptors(
        interceptors.LocalisationRequestInterceptor,
        interceptors.LoggingRequestInterceptor,
        interceptors.LoadAttributesRequestInterceptor)
    .addResponseInterceptors(
        interceptors.LoggingResponseInterceptor,
        interceptors.SaveAttributesResponseInterceptor)
    .withPersistenceAdapter(util.getPersistenceAdapter())
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda(); 