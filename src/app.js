const { SSL_OP_NO_TICKET } = require('constants')
const express = require('express');
const path = require('path');
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')            //we use destructuring to grab one property we want and store it as a standalone variable
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')
const hbs = require('hbs')
const forecast = require('./utils/forecast')

const app = express();
const PORT = process.env.PORT || 3000;
 

const publicDirPath = path.join(__dirname, '../public');

app.use(express.static(publicDirPath));

 

const server = app.listen(PORT, () => {
    console.log(`Server is up and running on port ${PORT}`);
});
 

socketio.listen(server);
 

const io = socketio(server);
 
 

io.on('connection', (socket) => {
    console.log('New websocket connection');

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        
        if(error){
            return callback(error)
        }

        socket.join(user.room)                       
        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })


        callback();
        
        
    })

    socket.on('SendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()
        if(filter.isProfane(message)){
            return callback('Profanity not allowed')
        }
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })
    socket.on('SendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
});

//Define path for express config
const viewsPath = path.join(__dirname, '../templates/views')
const partialsPath = path.join(__dirname, '../templates/partials')

//Setup handlebars engine and views location
app.set('view engine', 'hbs')
app.set('views', viewsPath)
hbs.registerPartials(partialsPath)

app.get('', (req,res) => {
    res.render('index',{
        title: 'WeatherEXPRESS',
        name: 'Skg'
    })
})

app.get('/about', (req,res) => {
    res.render('about', {
        title: 'About Me',
        name: 'Shivam'
    })
})
app.get('/help', (req, res) => {
    res.render('help', {
        title: 'Help',
        helpText: 'Help Arrives',
        name: 'Skg'
    })
})

app.get('', (req,res)=>{
    res.send('Hello Express! ')
})
app.get('/help', (req, res)=>{
    res.send('Help page')
})
app.get('/about', (req, res)=>{
    res.send('About app')
})
app.get('/weather', (req, res)=>{
    if(!req.query.address){
        res.send({
            error: 'You must provide an address!'
        })
    }
    forecast(req.query.address, (error, forecastData = {}) => {
        if(error){
            return res.send({ error })
        }
        res.send({
            forecast: forecastData,
            address: req.query.address
        })
    })
})
app.get('/help/*', (req, res)=>{
    res.render('404',{
        title: '404',
        name: 'Skg',
        errorMessage: 'Help article not found'
    })
})
app.get('*', (req, res)=> {
    res.render('404',{
        title: '404',
        name: 'Skg',
        errorMessage: 'Page not found'
    })
})
