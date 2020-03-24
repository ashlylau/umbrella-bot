# umbrella-bot
telegram bot which reminds me to bring an umbrella if its going to rain (+additional features I will add soon)

Add this bot on telegram: **@umbrella-test-bot**


## features
* daily reminder at 9am to bring an umbrella if it's raining
* ```/weather```: daily forecast
* ```/football```: weather during football practice on Mondays (7-10pm) + reminder on Monday 10am
* ```/random```: random fact generator
* ```/covid```: updates on covid cases


## commands
* weather - weather forecast for the next 2 hours
* rain - will it rain today?
* covid - daily covid updates (/covid {COUNTRY})
* random - give me a random fact
* football - will it rain during football prac on Monday?
* subscribe - subscribe for daily weather & covid updates
* unsubscribe - unsubscribe from daily updates


## running locally
stop heroku web dynos:

```heroku ps:stop web.1 -a umbrella-telegram-bot```

configure environment variables:

```source app-env```

run:

```node index.js```
