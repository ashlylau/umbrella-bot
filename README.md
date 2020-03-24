# umbrella-bot
telegram bot which reminds me to bring an umbrella if its going to rain (+additional features I will add soon)

Add this bot on telegram: **@umbrella-bot**


## features
* daily reminder at 9am to bring an umbrella if it's raining
* ```/weather```: daily forecast
* ```/football```: weather during football practice on Mondays (7-10pm) + reminder on Monday 10am
* ```/random```: random fact generator


## running locally
stop heroku web dynos:

```heroku ps:stop web.1 -a umbrella-telegram-bot```

configure environment variables:

```source app-env```

run:

```node index.js```
