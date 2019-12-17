//TODO: host this somewhere other than localhost
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios').default;
var schedule = require('node-schedule');

const LondonId = 2643741
const bot = new TelegramBot(process.env.token, {polling: true});

// // old weather api
// const weatherEndpoint = () => (
//   `http://api.openweathermap.org/data/2.5/weather?id=${LondonId}&units=metric&appid=${weatherID}`
// )

const weatherBitEndpoint = () => (
  `https://api.weatherbit.io/v2.0/forecast/hourly?city_id=${LondonId}&key=${process.env.weatherBitId}`
)

// bot.on('message', (msg) => {
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

//TODO: add other cool features for bot ie. weather summary, whether it will rain during football prac etc
// bot.on('message', (msg) => {
