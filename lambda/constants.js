module.exports = {
    // we no specify which attributes are saved
    PERSISTENT_ATTRIBUTES_NAMES : ['day', 'month', 'monthName', 'year','sessionCounter'],
    // these are the permissions needed to get the first name
    GIVEN_NAME_PERMISSION : ['alexa::profile:given_name:read'],
    // these are mermissions needed to send reminders
    REMINDERS_PERMISSION: ['alexa::alerts:reminders:skill:readwrite'],
    // max number of entries to fetch from the external API
    MAX_BIRTHDAYS: 5    
    }