const express = require("express")
const { createServer } = require("http")
const { Server } = require("socket.io")
const { createClient } = require('redis')
const { createAdapter } = require("@socket.io/redis-adapter")
//const { Emitter } = require("@socket.io/redis-emitter")


const SERVER_NAME = process.env.SERVER_NAME || 'Unknown'
const PORT = process.env.PORT || 3000
const HOST_REDIS = process.env.HOST_REDIS || '192.168.1.11'
const PORT_REDIS = process.env.PORT_REDIS || 6371


const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:4000', 'http://127.0.0.1:4000', 'http://192.168.1.4:4000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
})

const pubClient = createClient({ host: HOST_REDIS, port: PORT_REDIS })
const subClient = pubClient.duplicate()
//const emitter = new Emitter(pubClient)

io.adapter(createAdapter(pubClient, subClient))

const conn = new Map()

io.use((socket, next) => {
    console.log(`${SERVER_NAME} --- middleware --- ${socket.id}`)
    const user = socket.request.headers.username
    if (user === undefined || user === null) {
        next(new Error(`${SERVER_NAME} --- No user regis`))
    }
    console.log(`${SERVER_NAME} --- Welcome user --- ${user}`)
    conn.set(socket.id, socket)
    conn.get(socket.id)[`username`] = user.name
    socket.join(`${socket.request.headers.username}`)
    next()
})

io.on('connection', (socket) => {
    console.log(`${SERVER_NAME} --- ${socket.id}`)

    socket.on('private-message', msg => {
        console.log(`${SERVER_NAME} has been received, now notify to other node !`)
        io.to(`${msg.receiver}`).emit('receiver-message', msg.message)
    })

    socket.on('disconnect', () => {
        console.log(`${SERVER_NAME} --- Bye ${socket.username}  ! --- The total of user in server: ${conn.size - 1}`)
        conn.delete(socket.id)
    })
})

httpServer.listen(PORT, () => { console.log(`${SERVER_NAME} is listening at port: ${PORT}`) })
