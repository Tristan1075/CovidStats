const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const languageStrings = require('./localisation');
const constants = require('./constants');

const LoggingRequestInterceptor = {
    process(handlerInput) {
        console.log(`Incoming request: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    }
};
  
const LoggingResponseInterceptor = {
    process(handlerInput, response) {
        console.log(`Outgoing response: ${JSON.stringify(response)}`);
    }
};
  
// This request interceptor will bind a translation function 't' to the handlerInput.
const LocalisationRequestInterceptor = {
    process(handlerInput) {
        const localisationClient = i18n.init({
            // lng: handlerInput.requestEnvelope.request.locale,
            lng: Alexa.getLocale(handlerInput.requestEnvelope),
            resources: languageStrings,
            returnObjects: true
        })
        localisationClient.localise = (...args) => {
            const value = i18n.t(...args);
            if (Array.isArray(value)) {
                return value[Math.floor(Math.random() * value.length)];
            }
            return value;
        }
        handlerInput.t = (...args) => localisationClient.localise(...args)
    }
  };
  
const LoadAttributesRequestInterceptor = {
    async process(handlerInput) {
        const {attributesManager, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        // the "loaded" check is because the session "new" flag is lost if there's a one shot utterance that hits an intent with auto-delegate
        const loadedThisSession = sessionAttributes['loaded']; // is this a new session? not lloaded from db ?
        if (Alexa.isNewSession(requestEnvelope) || !loadedThisSession) {
            const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
            console.log('Loading from persistent storage: ', JSON.stringify(persistentAttributes));
            persistentAttributes['loaded'] = true;
            attributesManager.setSessionAttributes(persistentAttributes);
        }
    }
}
  
  const SaveAttributesResponseInterceptor = {
      async process(handlerInput, response) {
          if (!response) return;
          const {attributesManager, requestEnvelope} = handlerInput;
          const sessionAttributes = attributesManager.getSessionAttributes();
          const shouldEndSession = (typeof response.shouldEndSession === "undefined" ? true: response.shouldEndSession);
          // the "loaded" check is because the session "new" flag is lost if there's a one shot utterance that hits an intent with auto-delegate
          const loadedThisSession = sessionAttributes['loaded'];
          if ((shouldEndSession || Alexa.getRequestType(requestEnvelope) === "SessionEndedRequest") && loadedThisSession) {
              sessionAttributes['sessionCounter'] = sessionAttributes['sessionCounter'] ? sessionAttributes['sessionCounter'] + 1: 1;
              for (var key in sessionAttributes) {
                  if (!constants.PERSISTENT_ATTRIBUTES_NAMES.includes(key))
                  delete sessionAttributes[key]
                }
              console.log('Saving to persistent storage: ', JSON.stringify(sessionAttributes));
              attributesManager.setPersistentAttributes(sessionAttributes)
              await attributesManager.savePersistentAttributes();
          }
      }
  }

  const LoadNameRequestInterceptor = {
      async process(handlerInput) {
        const {attributesManager, serviceClientFactory, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        if (!sessionAttributes['name']) {
            // let's try to get the given name via the Customer API
            // don't forget to enable this permission in your skill configuration (Build tab -> Permissions)
            // or you'll get a SessionEndRequest with an ERROR of type INVALID_RESPONSE
            // Per our policies you can't make personal data persistent so we limt "name" to session attributes
            // Skills cannot collect personal identifiable information (PII)
            try {
                const {permissions} = requestEnvelope.context.System.user;
                if (!(permissions && permissions.consentToken))
                    throw {statusCode: 401, message: 'No permission available'}; // there are zero permission, no point in initializing API
                const upsServiceClient = serviceClientFactory.getUpsServiceClient();
                const profileName = await upsServiceClient.getProfileGivenName();
                if (profileName) { // the user might not have set the name
                    sessionAttributes['name'] = profileName;
                }
            }  catch (error) {
                console.log('LoadNameRequestInterceptor' + JSON.stringify(error));
                if (error.statusCode === 401 || error.statusCode === 403) {
                    // the user needs to enable the permissions for given name, let's append a permissions card to the response
                    handlerInput.responseBuilder.withAskForPermissionsConsentCard(constants.GIVEN_NAME_PERMISSION)
                }
            }
        }
    }
  }

  const LoadTimezoneRequestInterceptor = {
    async process(handlerInput) {
        const {attributesManager, serviceClientFactory, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const deviceId = Alexa.getDeviceId(requestEnvelope);
        if (!sessionAttributes['timezone']) {
            // let's try to get the timezone via the UPS API
            // (no permission required but it might not be set up)
            try {
                const upsServiceClient = serviceClientFactory.getUpsServiceClient();
                const timezone = await upsServiceClient.getSystemTimeZone(deviceId);
                if (timezone) { // the user might not have set the timezone yet
                    console.log('Got timezone for device', timezone);
                    // save to session attributes
                    sessionAttributes['timezone'] = timezone;
                } else {
                    sessionAttributes['timezone'] = 'Europe/Paris';
                }
            } catch (error) {
                console.log('LoadTimezoneRequestInterceptor' + JSON.stringify(error));
                sessionAttributes['timezone'] = 'Europe/Paris';
            }
        }
    } 
  }

  module.exports = {
    LoggingRequestInterceptor,
    LoggingResponseInterceptor,
    LocalisationRequestInterceptor,
    LoadAttributesRequestInterceptor,
    SaveAttributesResponseInterceptor,
    LoadNameRequestInterceptor,
    LoadTimezoneRequestInterceptor
  }