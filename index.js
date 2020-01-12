const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios').default;
var schedule = require('node-schedule');

// connect Express to open port for Heroku (R10 error)
const express = require('express');
const expressApp = express();

const port = process.env.PORT || 3000;
expressApp.get('/', (req, res) => {
  res.send('Hello World!')
});
expressApp.listen(port, () => {
  console.log(`Listening on port ${port}`)
});

const LondonId = 2643741
const bot = new TelegramBot(process.env.token, {polling: true});

const weatherBitEndpoint = () => (
  `https://api.weatherbit.io/v2.0/forecast/hourly?city_id=${LondonId}&key=${process.env.weatherBitId}`
)

// bot.onText(/\/rain/, (msg) => {
// this function is called every morning at 9am
var j = schedule.scheduleJob('0 9 * * *', function(){
  const endpoint = weatherBitEndpoint();
  axios.get(endpoint).then((resp) => {
    const data = resp.data.data;  // this is an array of 120 hourly predictions (starts from the next hour from when you call this)

    var rain_periods = [];  // list of intervals where it will rain
    var i;
    for (i = 0; i < 24; i++) {
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
      const rainMessage = formatRainMessage(rain_periods);
      bot.sendMessage(process.env.ashChatId, 'Bring your umbrella!!!');
      bot.sendMessage(process.env.ashChatId, rainMessage);
    } else {
      bot.sendMessage(process.env.ashChatId, "Nah its not gonna rain lol")
    }
  }, error => { console.log(error); })
});

function formatRainMessage(rain_periods) {
  rainMessage = "It's gonna rain from";
  var start = rain_periods[0].getHours();
  var startIndex = 0;
  var end = start;
  var timingRanges = [0];
  var i;
  for (i = 1; i < rain_periods.length; i++) {
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

  var i;
  for (i = 0; i < timingRanges.length/2; i++) {
    rainMessage = rainMessage + " ";
    rainMessage = rainMessage + rain_periods[timingRanges[i]].toLocaleTimeString('en-US');
    rainMessage = rainMessage + " to ";
    rainMessage = rainMessage + rain_periods[timingRanges[i+1]].toLocaleTimeString('en-US');
  }
  rainMessage = rainMessage + " today."
  console.log(rainMessage);
  return rainMessage;
}

bot.onText(/\/weather/, (msg) => {
  const chatId = msg.chat.id;
  const endpoint = weatherBitEndpoint();
  axios.get(endpoint).then((resp) => {
    const data = resp.data.data;  // this is an array of 120 hourly predictions (starts from the next hour from when you call this)
    console.log(data);

    var rain_periods = [];  // list of intervals where it will rain
    var weatherInfoList = [];
    var i;
    for (i = 0; i < 24; i++) {
      const hour_data = data[i];
      var date = new Date(hour_data.timestamp_utc);
      const time = date.toLocaleTimeString('en-US');

      console.log(time);
      const weather = hour_data.weather;
      const desc = weather.description;

      var weatherInfo = [date, weather];
      weatherInfoList.push(weatherInfo);
    }
    bot.sendMessage(chatId, formatWeatherMessage(weatherInfoList));
  }, error => { console.log(error); })
});

//TODO: fix this
function formatWeatherMessage(weatherInfoList) {
  var message = "Here is the weather forecast:\n";
  var weatherDesc = weatherInfoList[0][1].description;
  var startTime = weatherInfoList[0][0];
  var endTime = startTime;
  var i;
  for (i = 1; i < weatherInfoList.length; i++) {
    const currWeatherDesc = weatherInfoList[i][1].description;
    const currTime = weatherInfoList[i][0];
    console.log(currTime);
    console.log(weatherInfoList[i][1]);
    if (weatherDesc.localeCompare(currWeatherDesc) == 0) {
      endTime = currTime;
    } else {
      message = message + weatherDesc;
      message = message + ": "
      message = message + startTime.toLocaleTimeString('en-US');
      message = message + " - "
      message = message + endTime.toLocaleTimeString('en-US');
      message = message + "\n"
      weatherDesc = currWeatherDesc;
      startTime = endTime = currTime;
    }
  }
  message = message + weatherDesc;
  message = message + ": "
  message = message + startTime.toLocaleTimeString('en-US');
  message = message + " - "
  message = message + endTime.toLocaleTimeString('en-US');
  return message;
}

// random default response messages
bot.on('message', (msg) => {
  if (msg.text == "hi" || msg.text == "Hi") {
    bot.sendMessage(msg.chat.id, "lol hi :)");
  } else if (msg.text == "whats the weather") {
    bot.sendMessage(msg.chat.id, "use the \\weather command");
  } else {
    bot.sendMessage(msg.chat.id, "<3");
  }
});
