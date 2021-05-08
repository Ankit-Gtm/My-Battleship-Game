const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 3000
const socketio = require('socket.io')
const { Socket } = require('dgram')
const { TIMEOUT } = require('dns')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

//set static folder
app.use(express.static(path.join(__dirname,"public")))

//start server
server.listen(PORT, () => console.log(`server running on port ${PORT}`))

//handle a socket connection request from web client
const connections = [null,null]

io.on('connection', socket => {
    // console.log('new WS connection')
    //find available player number
    let playerIndex = -1
    for (const i in connections) {
        if (connections[i] === null) {
            playerIndex = i
            break
        }
    }

    // tell the connecting client what player number they are
    socket.emit('player-number', playerIndex)

    console.log(`player ${playerIndex} has connected`)

    //ignore player 3
    if (playerIndex === -1) return

    connections[playerIndex] = false

    //tell everyone what player number just connected
    socket.broadcast.emit('player-connection', playerIndex)

    //Handle disconnections
    socket.on('disconnect', () => {
        console.log(`player ${playerIndex} disconnected`)
        connections[playerIndex] = null
         //tell everyone what player number just disconnected
        socket.broadcast.emit('player-connection', playerIndex)
    })

    //on ready
    socket.on('player-ready', () => {
        socket.broadcast.emit('enemy-ready', playerIndex)
        connections[playerIndex] = true
    })

    // check player connections
    socket.on('check-players', () => {
        const players = []
        for (const i in connections) {
            connections[i] === null ? players.push({connected:false, ready:false}) : players.push({connected:true, ready:connections[i]})
        }
        socket.emit('check-players',players)
    })

    //on fire received
    socket.on('fire', id => {
        console.log(`shot fired from ${playerIndex}`, id)

        //emit the move to the other player
        socket.broadcast.emit('fire', id)
    })

    //on fire reply
    socket.on('fire-reply', square => {
        console.log(square)

        //forward the reply to the other player
        socket.broadcast.emit('fire-reply', square)
    })

    //timeout connection
    setTimeout( () => {
        connections[playerIndex] = null
        socket.emit('timeout')
        socket.disconnect()
    },600000) //ten minute limit per player



})