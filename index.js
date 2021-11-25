const express = require("express")
const { createServer } = require("http")
const { Server } = require("socket.io")
const { createClient } = require('redis')
const { createAdapter } = require("@socket.io/redis-adapter")
const app = express()
const SERVER_NAME = process.env.SERVER_NAME || 'Unknown'
const PORT = process.env.PORT || 3000
const HOST_REDIS = process.env.HOST_REDIS || '192.168.1.11'
const PORT_REDIS = process.env.PORT_REDIS || 6371


const httpServer = createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:4000', 'http://127.0.0.1:4000', 'http://192.168.1.11:4000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
})

const pubClient = createClient({ host: HOST_REDIS, port: PORT_REDIS })
const subClient = pubClient.duplicate()

io.adapter(createAdapter(pubClient, subClient))

const conn = new Map()

io.on('connection', (socket) => {
    conn.set(socket.id, socket)
    console.log(`${SERVER_NAME} --- ${socket.id}`)

    socket.on('register-user', user => {
        conn.get(socket.id)[`username`] = user.name
        console.log(`${SERVER_NAME} --- Welcome ${user.name}  ! --- The total of user in server: ${conn.size}`)
    })

    socket.on('private-message', msg => {
        console.log(`${SERVER_NAME} has been received, now notify to other node !`)
        socket.broadcast.emit('handle-message', msg)
        //console.log(`${SERVER_NAME} --- message send: ${msg.message}`)
        // conn.forEach(client => {
        //     console.log(`${SERVER_NAME} --- client id : ${client.id} --- username: ${client.username}`)
        //     if (client.username === msg.receiver) {
        //         emitter.emit('receiver-message', msg.message)
        //         console.log(`${SERVER_NAME} --- Send message from ${client.username} to ${msg.receiver} with message: ${msg.message} !`)
        //     }
        // })
    })

    socket.on('handle-message', msg => {
        console.log(`${SERVER_NAME} --- receiver : ${msg.receiver} --- message : ${msg.message}`)
        conn.forEach(client => {
            console.log(`${SERVER_NAME} --- client id : ${client.id} --- username: ${client.username}`)
            if (client.username === msg.receiver) {
                socket.broadcast.emit('receiver-message', msg.message)
                console.log(`${SERVER_NAME} --- Send message from ${client.username} to ${msg.receiver} with message: ${msg.message} !`)
            }
        })
    })

    socket.on('disconnect', () => {
        console.log(`${SERVER_NAME} --- Bye ${socket.username}  ! --- The total of user in server: ${conn.size - 1}`)
        conn.delete(socket.id)
    })
})

httpServer.listen(PORT, () => { console.log(`${SERVER_NAME} is listening at port: ${PORT}`) })
