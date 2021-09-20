const { SSL_OP_NO_TICKET } = require('constants')
const express = require('express');
const path = require('path');
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')           
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

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

        socket.join(user.room)                        //Through this step we will emitting events only to this room i.e. messages will be sent only to this particular room
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