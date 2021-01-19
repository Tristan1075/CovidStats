const moment = require('moment-timezone'); // will help us do all the dates math while considering the moment-timezone
const util = require('./util');
const axios = require('axios');

const getBirthdayData = (day, month, year, timezone) => {
    const today = moment().tz(timezone).startOf('day');
    const wasBorn = moment(`${month}/${day}/${year}`, 'MM/DD/YYYY').tz(timezone).startOf('day');
    const nextBirthday = moment(`${month}/${day}/${today.year()}`, 'MM/DD/YYYY').tz(timezone).startOf('day');
    if (today.isAfter(nextBirthday)) {
        nextBirthday.add(1, 'years');
    }
    const age = today.diff(wasBorn, 'years');
    const daysAlive = today.diff(wasBorn, 'days');
    const daysUntilBirthday = nextBirthday.startOf('day').diff(today, 'days'); //same day returns 0
    
    return {
        daysAlive,
        daysUntilBirthday,
        age
    }
};

const createBirthdayReminder = (daysUntilBirthday, timezone, locale, message) => {
    moment.locale(locale);
    const createMoment = moment().tz(timezone);
    let triggerMoment = createMoment.startOf('day').add(daysUntilBirthday, 'days');
    if (daysUntilBirthday === 0) {
        triggerMoment = createMoment.startOf('day').add(1, 'years'); // reminder created on the day of birthday will trigger next year
    }
    console.log('Reminder schedule', triggerMoment.format('YYYY-MM-DDTHH:mm:00.000'));
    
    return util.createReminder(createMoment, triggerMoment, timezone, locale, message);
};

const getAdjustedDate = (timezone) => {
    const today = moment().tz(timezone).startOf('day');
    return {
        day: today.date(),
        month: today.month() + 1
    }
};

const fetchBirthdays = (day, month, limit) => {
    const ENDPOINT = 'https://query.wikidata.org/sparql';
    // list of actors with pictures and date of birth for a given day and month
    const sparqlQuery = `SELECT DISTINCT ?human ?humanLabel ?picture ?date_of_birth ?place_of_birthLabel WHERE { 
        ?human wdt:P31 wd:Q5; wdt:P106 wd:Q33999; wdt:P18 ?picture. 
        FILTER((DATATYPE(?date_of_birth)) = xsd:dateTime) 
        FILTER((MONTH(?date_of_birth)) = ${month}) 
        FILTER((DAY(?date_of_birth)) = ${day}) 
        FILTER(!BOUND(?date_of_death))
        FILTER (BOUND(?place_of_birth)) 
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } 
        OPTIONAL { ?human wdt:P569 ?date_of_birth. } 
        OPTIONAL { ?human wdt:P570 ?date_of_death. } 
        OPTIONAL { ?human wdt:P19 ?place_of_birth. }
        } 
        LIMIT ${limit}`;
    console.log('Wikidata Query:', sparqlQuery);
    const url = `${ENDPOINT}?query=${encodeURIComponent(sparqlQuery)}`;
    console.log('Wikidata Query URL:', url);
    const config = {
        timeout: 6500, // timeout API call before we reach Alexa's 8 second timeout, or set globally via axios.defaults.timeout
        headers: {'Accept': 'application/sparql-results+json'}
    };
    async function getJsonResponse(url, config) {
        const res = await axios.get(url, config);
        return res.data;
    }
    return getJsonResponse(url, config)
        .then((result) => result)
        .catch((error) => null)
}

const convertBirthdateToYearsOld = (person, timezone) => {
    const today = moment().tz(timezone).startOf('day');
    const wasBorn = moment(person.date_of_birth.value).tz(timezone).startOf('day');
    return today.diff(wasBorn, 'years');
}

const convertBirthdaysResponse = (handlerInput, response, withAge, timezone) => {
    const {t} = handlerInput;
    let speechResponse = '';
    // if the API call failed we just don't append today's birthdays to the response
    if (!response || !response.results || !response.results.bindings || !Object.keys(response.results.bindings) > 0) {
        return speechResponse;
    }
    const results = response.results.bindings;
    speechResponse += t('ALSO_TODAY_MSG');
    const numberOfResults = Object.keys(results).length;
    results.forEach((person, index) => {
        console.log('Person birthday', person);
        speechResponse += person.humanLabel.value;
        if (withAge && timezone && person.date_of_birth.value) {
            speechResponse += t('TURNING_YO_MSG', {count: convertBirthdateToYearsOld(person, timezone)});
        }
        if (index === numberOfResults - 2) {
            speechResponse += t('CONJUNCTION_MSG');
        } else {
            speechResponse += '. ';
        }
    });
    return speechResponse;
}

module.exports = {
    getBirthdayData,
    createBirthdayReminder,
    getAdjustedDate,
    fetchBirthdays,
    convertBirthdaysResponse
}