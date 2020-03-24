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

// send message everyday at 9am about whether it will rain
var j = schedule.scheduleJob('0 9 * * *', function(){
  sendMessage(sg24HourForecast, undefined, sgRainMessage);
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Hey!\n To get the weather forecast, use the \\weather command\n"
                               + "To know if you need to bring an umbrella use the \\rain command\n"
                               + "To get random facts use \\random.");
});

bot.onText(/\/rain/, (msg) => {
  sendMessage(sg24HourForecast, msg, sgRainMessage);
});

// weather forecast for the next 2 hours
bot.onText(/\/weather/, (msg) => {
  sendMessage(sg2HourForecast, msg, sgWeatherForecast);
});

bot.onText(/\/football/, (msg) => {
  sendMessage(sg24HourForecast, msg, footballMessage);
});

// random fact generator
bot.onText(/\/random/, (msg) => {
  sendMessage(randomFactEndpoint, msg, randomMessage);
});

// random default response messages
bot.on('message', (msg) => {
  if (msg.text == "hi" || msg.text == "Hi") {
    bot.sendMessage(msg.chat.id, "lol hi :)");
  } else if (msg.text == "whats the weather") {
    bot.sendMessage(msg.chat.id, "use the \\weather command");
  }
});

function sendMessage(endpoint, msg, generateMessage) {
  const msgId = msg == undefined ? process.env.ashChatId : msg.chat.id;
  axios.get(endpoint).then((resp) => {
    generateMessage(resp, msgId);
  }, error => { console.log(error); });
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


