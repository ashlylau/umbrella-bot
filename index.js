const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios').default;
var schedule = require('node-schedule');

// connect Express to open port for Heroku (fix R10 error)
const express = require('express');
const expressApp = express();

const port = process.env.PORT || 3000;
expressApp.get('/', (req, res) => {
  res.send('Hello World! Umbrella Telegram Bot at your service')
});
expressApp.listen(port, () => {
  console.log(`Listening on port ${port}`)
});

// ping heroku app every 15 min
var http = require("http");
setInterval(function() {
    http.get("http://umbrella-telegram-bot.herokuapp.com");
    console.log("ping");
}, 900000); // every 15 minutes (900000)

const randomFactEndpoint = "https://uselessfacts.jsph.pl/random.json?language=en";
const sg24HourForecast = `https://api.data.gov.sg/v1/environment/24-hour-weather-forecast?date=${getDate()}`;
const sg2HourForecast = `https://api.data.gov.sg/v1/environment/2-hour-weather-forecast?date=${getDate()}`;

const bot = new TelegramBot(process.env.token, {polling: true});

var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: process.env.password,
  database: 'umbrelladb'
});

function makeQuery(query) {
  con.connect(function(err) {
    console.log("Connected!");

    con.query(query, function (err, result) {
      console.log(`Made query: ${query}`);
      console.log(result);
    });
  });
}

// query all user ids and send message updates
function queryUsers(query) {
  con.connect(function(err) {
    console.log("Connected!");

    con.query(query, function (err, result) {
      console.log(`Made query: ${query}`);
      for (var i in result) {
        console.log(result[i].msgid);
        sendCovidMessage(result[i].msgid, covidMessage, undefined);
        sendMessage(sg24HourForecast, result[i].msgid, sgRainMessage);
      }
    });
  });
}

// send message everyday at 9am
var j = schedule.scheduleJob('0 1 * * *', function(){
  queryUsers('SELECT * from users;');
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Hey!\nTo get the weather forecast, use the \/weather command\n"
                               + "To know if you need to bring an umbrella use the \/rain command\n"
                               + "To get random facts use \/random.\n"
                               + "For Covid-19 updates use \/covid {country_name} eg. \/covid Singapore\n"
                               + "To subscribe for daily updates use \/subscribe");
});

bot.onText(/\/rain/, (msg) => {
  sendMessage(sg24HourForecast, msg.chat.id, sgRainMessage);
});

// subscribe for daily updates
bot.onText(/\/subscribe/, (msg) => {
  makeQuery(`INSERT INTO users (msgid) VALUES ('${msg.chat.id}')`);
  bot.sendMessage(msg.chat.id, "subscribed for covid & weather updates!");
});

// unsubscribe from daily updates
bot.onText(/\/unsubscribe/, (msg) => {
  makeQuery(`DELETE FROM users WHERE msgid = ${msg.chat.id}`);
  bot.sendMessage(msg.chat.id, "unsubscribed!");
});

// weather forecast for the next 2 hours
bot.onText(/\/weather/, (msg) => {
  sendMessage(sg2HourForecast, msg.chat.id, sgWeatherForecast);
});

bot.onText(/\/football/, (msg) => {
  sendMessage(sg24HourForecast, msg.chat.id, footballMessage);
});

// random fact generator
bot.onText(/\/random/, (msg) => {
  sendMessage(randomFactEndpoint, msg.chat.id, randomMessage);
});

// covid updates
bot.onText(/\/covid/, (msg, match) => {
  sendCovidMessage(msg.chat.id, covidMessage, match);
});

// random default response messages
bot.on('message', (msg) => {
  if (msg.text == "hi" || msg.text == "Hi") {
    bot.sendMessage(msg.chat.id, "lol hi :)");
  } else if (msg.text == "whats the weather") {
    bot.sendMessage(msg.chat.id, "use the \\weather command");
  }
});

function sendMessage(endpoint, msgId, generateMessage) {
  axios.get(endpoint).then((resp) => {
    generateMessage(resp, msgId);
  }, error => { console.log(error); });
}

// for testing
bot.onText(/\/blah/, (msg) => {
  queryUsers('SELECT * from users;');
});

function sendCovidMessage(msgId, generateMessage, match) {
  var country = 'Singapore';  // default
  if (match != undefined) {
    var temp = match.input.split(' ')[1];
    if (temp != undefined) country = temp;
  }
  axios({
    "method":"GET",
    "url":"https://covid-193.p.rapidapi.com/statistics",
    "headers":{
    "content-type":"application/octet-stream",
    "x-rapidapi-host":"covid-193.p.rapidapi.com",
    "x-rapidapi-key":`${process.env.rapidApiKey}`,
    },"params":{
    "country":`${country}`
    }
    })
    .then((resp) => {
      generateMessage(resp, msgId);
    })
    .catch((error)=>{
      console.log(error)
    })
}

function covidMessage(resp, msgId) {
  const data = resp.data.response;
  console.log(data);
  const country = data[0].country;
  const cases = data[0].cases;
  const deaths = data[0].deaths;
  var message = `COVID-19 updates for ${country} (${getDate()}):\n\n`;
  message += 'CASES\n';
  for (var x in cases) {
    message += `${x}: ${cases[x]===null? 0 : cases[x]}\n`;
  }
  message += '\nDEATHS\n';
  for (var y in deaths) {
    message += `${y}: ${deaths[y]===null? 0 : deaths[y]}\n`;
  }
  bot.sendMessage(msgId, message);
}

function sgRainMessage(resp, msgId) {
  const data = resp.data.items[0];
  const forecast = data.general.forecast;
  const humidity = data.general.relative_humidity.high;
  const tempH = data.general.temperature.high;
  const tempL = data.general.temperature.low;
  if (humidity > 60) {
    bot.sendMessage(msgId, 'Bring your umbrella!!! \u2614');
  } else {
    bot.sendMessage(msgId, 'Nah its not gonna rain today lol');
  }
  bot.sendMessage(msgId, `Weather forecast: ${forecast}, Temperature: ${tempL}-${tempH}`);
}

function sgWeatherForecast(resp, msgId) {
  const data = resp.data.items;
  const latest = data[data.length-1];
  const bishanForecast = latest.forecasts[2].forecast;
  bot.sendMessage(msgId, `Forecast for the next 2 hours: ${bishanForecast}`);
}

function randomMessage(resp, msgId) {
  const randomFact = resp.data.text;
  bot.sendMessage(msgId, "Here's a random ass fact: \uD83D\uDC7E");
  bot.sendMessage(msgId, randomFact);
}

function footballMessage(resp, msgId) {
  bot.sendMessage(msgId, "no football training till next year \uD83D\uDE22\nhave some soccer emojis for the time being: \u26BD\u26BD\u26BD\u26BD\u26BD")
}

function getDate() {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0');
  var yyyy = today.getFullYear();

  return yyyy + '-' + mm + '-' + dd;
}


