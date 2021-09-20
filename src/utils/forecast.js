const request = require('postman-request')
const forecast = (address, callback) => {
    const url = 'https://api.openweathermap.org/data/2.5/weather?q='+ encodeURIComponent(address) +'&appid=34abd63d14b680ad0d55ff53a3eac977&units=metric'

    request({ url, json: true }, (error, response) => {

        if(error){
            callback('Unable to connect to server ', undefined)
        }else if(response.body.cod !== '404'){
            callback(undefined, 'It is currently ' + response.body.main.temp + ' degrees out. There is a ' + response.body.main.humidity + '% chance of rain.' )
        }else{
            callback('Unable to find location', undefined)
        }
    })
}
module.exports = forecast