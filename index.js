const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios').default;
var schedule = require('node-schedule');

// connect Express to open port for Heroku (fix R10 error)
const express = require('express');
const expressApp = express();

const port = process.env.PORT || 3000;
expressApp.get('/', (req, res) => {
  res.send('Hello World!')
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

const LondonId = 2643741
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const weatherBitEndpoint = 
  `https://api.weatherbit.io/v2.0/forecast/hourly?city_id=${LondonId}&key=${process.env.weatherBitId}`;
const randomFactEndpoint = "https://uselessfacts.jsph.pl/random.json?language=en";

const bot = new TelegramBot(process.env.token, {polling: true});


// send message everyday at 9am about whether it will rain
var j = schedule.scheduleJob('0 9 * * *', function(){
  sendMessage(weatherBitEndpoint, undefined, rainMessage);
});

bot.onText(/\/rain/, (msg) => {
  sendMessage(weatherBitEndpoint, msg, rainMessage);
});

// weather forecast for the next 24 hours
bot.onText(/\/weather/, (msg) => {
  sendMessage(weatherBitEndpoint, msg, weatherMessage);
});

// message on monday 10am with weather forecast during football training at 7-10pm
var i = schedule.scheduleJob('0 10 * * 1', function(){
  sendMessage(weatherBitEndpoint, undefined, footballMessage);
});

bot.onText(/\/football/, (msg) => {
  sendMessage(weatherBitEndpoint, msg, footballMessage);
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

function rainMessage(resp, msgId) {
  // this is an array of 120 hourly predictions (starts from the next hour from when you call this)
  const data = resp.data.data;

  var rain_periods = [];  // list of intervals where it will rain
  for (var i = 0; i < 24; i++) {
    const hour_data = data[i];
    var date = new Date(hour_data.timestamp_utc);
    const time = date.toLocaleTimeString('en-US');
    if (time.localeCompare('1:00:00 AM') === 0) {  // stop looking at times after 12 midnight
      break;
    }
    console.log(time);
    const weather = hour_data.weather;
    const desc = weather.description;
    if (desc.includes('rain')) {  //TODO: replace this with a weather code check
      rain_periods.push(date);
    }
    console.log(weather);
  }
  console.log(rain_periods);
  if (rain_periods.length > 0) {
    bot.sendMessage(msgId, 'Bring your umbrella!!! \u2614');
    bot.sendMessage(msgId, formatRainMessage(rain_periods));
  } else {
    bot.sendMessage(msgId, "Nah its not gonna rain today lol")
  }
}

function formatRainMessage(rain_periods) {
  var rainMessage = "It's gonna rain from";
  var start = rain_periods[0].getHours();
  var end = start;
  var timingRanges = [0];
  for (var i = 1; i < rain_periods.length; i++) {
    var curr = rain_periods[i].getHours();
    if (curr - end > 1) {
      timingRanges.push(i-1);  // push previous index because that is the end range
      start = end = curr;
      startIndex = i;
      timingRanges.push(i);
    } else {
      end = curr;
    }
  }
  timingRanges.push(rain_periods.length-1);

  for (var i = 0; i < timingRanges.length/2; i++) {
    rainMessage = rainMessage + " ";
    rainMessage = rainMessage + rain_periods[timingRanges[i]].toLocaleTimeString('en-US');
    rainMessage = rainMessage + " to ";
    rainMessage = rainMessage + rain_periods[timingRanges[i+1]].toLocaleTimeString('en-US');
  }
  rainMessage = rainMessage + " today."
  return rainMessage;
}

function weatherMessage(resp, msgId) {
  // this is an array of 120 hourly predictions (starts from the next hour from when you call this)
  const data = resp.data.data;

  console.log(data);
  var weatherForecast = [];
  for (var i = 0; i < 24; i++) {
    var date = new Date(data[i].timestamp_utc);
    const timeStr = date.toLocaleTimeString('en-US');
    const time = timeStr.split(":");
    weatherForecast.push((time[0].length == 1 ? "0" : "") + time[0] + time[2].substr(3, 2));
    weatherForecast.push(": ");
    weatherForecast.push(data[i].temp);
    weatherForecast.push(" deg, ");
    weatherForecast.push(data[i].weather.description);
    weatherForecast.push("\n");
  }
  bot.sendMessage(msgId, "Here's the weather for the next 24 hours \u26C5");
  bot.sendMessage(msgId, weatherForecast.join(""));
}

function footballMessage(resp, msgId) {
  // this is an array of 120 hourly predictions (starts from the next hour from when you call this)
  const data = resp.data.data;

  // filter appropriate timings
  var footballTiming = data.filter(function(day) {
    var date = new Date(day.timestamp_utc);
    const time = date.toLocaleTimeString('en-US');
    return ["7:00:00 PM", "8:00:00 PM", "9:00:00 PM"].includes(time) && date.getDay() == 1;
  });

  if (footballTiming.length != 0) {
    var weather = new Set();
    var temp = 0;
    for (timing of footballTiming) {
      weather.add(timing.weather.description);
      temp += timing.temp/3;
    }
    // get today's date
    var date = new Date(footballTiming[0].timestamp_utc);
    var dateString = date.getDate() + " " + months[date.getMonth()];

    bot.sendMessage(msgId, "Football training 7-10pm today (" + dateString + ") \u26BD");
    bot.sendMessage(msgId, 'Weather: ' + Array.from(weather).join(', ') +
                           ', Temp: ' + temp.toFixed(2));
  } else {
    bot.sendMessage(msgId, "Weather data not available yet \uD83D\uDE22");
  }
}

function randomMessage(resp, msgId) {
  const randomFact = resp.data.text;
  bot.sendMessage(msgId, "Here's a random ass fact: \uD83D\uDC7E");
  bot.sendMessage(msgId, randomFact);
}
