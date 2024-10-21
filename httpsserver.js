// We need the file system here
var fs = require("fs");
require('dotenv').config({ path: './secrets.env' });
const apiKey = process.env.API_KEY;

// for live web

// Express is a node module for building HTTP servers
var express = require("express");
var app = express();

// Tell Express to look in the "public" folder for any files first
app.use(express.static("public"));

// If the user just goes to the "route" / then run this function
app.get("/", function (req, res) {
  res.send("please use the url with the project you want to find :)");
});
// Endpoint to expose environment variables
app.get('/api/env', (req, res) => {
  res.json({
    apiKey: process.env.API_KEY,
  });
});

// Here is the actual HTTP server
// In this case, HTTPS (secure) server
var https = require("https");

// Security options - key and certificate
var options = {
  key: fs.readFileSync("privkey1.pem"),
  cert: fs.readFileSync("cert1.pem"),
};

// We pass in the Express object and the options object
var httpServer = https.createServer(options, app);

// Default HTTPS port
httpServer.listen(443);

// WebSocket Portion
// WebSockets work with the HTTP server
const { Server } = require("socket.io");
const io = new Server(httpServer, {});

//var io = require('socket.io').listen(httpServer);

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on(
  "connection",
  // We are given a websocket object in our function
  function (socket) {
    console.log("We have a new client: " + socket.id);

    // When this user "send" from clientside javascript, we get a "message"
    // client side: socket.send("the message");  or socket.emit('message', "the message");
    socket.on(
      "message",
      // Run this function when a message is sent
      function (data) {
        console.log("message: " + data);

        // To all clients
        io.sockets.emit("message", data);
      }
    );

    // When this user emits, client side: socket.emit('otherevent',some data);
    socket.on("otherevent", function (data) {
      // Data comes in as whatever was sent, including objects
      console.log("Received: 'otherevent' " + data);
    });

    // for wk2
    // When this user emits, client side: socket.emit('otherevent',some data);
    socket.on("chatmessage", function (data) {
      // Data comes in as whatever was sent, including objects
      console.log("Received: 'chatmessage' " + data);

      // Send it to all of the clients
      io.emit("chatmessage", data);
    });

    // for wk3
    socket.on("w3mouse", function (data) {
      // io.emit("mouse", data);
      // console.log("mouse moved serverside");
      var dataPlusId = {
        x: data.x,
        y: data.y,
        handId: socket.id,
      };
      // console.log(dataPlusId);
      socket.broadcast.emit("w3mouse", dataPlusId);
      // io.emit('w3mouse', dataPlusId);
    });

    // for FPJ START

    // saves Hosty's ID
    socket.on("fpjHostyConnect", function () {
      if (!fpjHosty) {
        fpjHosty = new FPJUser(socket, socket.id, "josh");
        console.log("fpj: Josh connected with socket.id: " + fpjHosty.id);
        socket.emit("fpjHostyConfirm");
      } else {
        console.log("fpj: Josh already connected, connection attempt rejected");
        socket.emit("fpjHostyDoubleUp");
      }
    });

    socket.on("fpjHostyDisconnect", function () {
      if (!fpjHosty) {
        console.log("no hosty to disconnect");
      } else {
        fpjHosty = null;
        console.log("fpj: Josh disconnected, fpjHosty cleared");
        io.emit("fpjHostyDisconnect", socket.id);
      }
    });

    socket.on("fpjHostyPing", function () {
      io.emit("fpjYesHosty", fpjHosty.id);
    });

    socket.on("fpjUnhauntPing", function () {
      io.emit("fpjNoActiveGhosty");
    });

    socket.on("fpjGhostyCheck", function () {
      if (fpjGhosty) {
        let dataToSend = {
          id: fpjGhosty.id,
          ghostName: fpjGhosty.name,
        };
        socket.emit("fpjGhostyConnect", dataToSend);
      } else {
        console.log("no ghosty available");
      }
    });

    // check for active hosty
    socket.on("fpjHostyCheck", function () {
      console.log("hosty check from new fpj connection");
      if (!fpjHosty) {
        socket.emit("fpjNoHosty");
      } else {
        socket.emit("fpjYesHosty", fpjHosty.id);
      }
    });

    // save ghosty's ID in array
    socket.on("fpjGhostyConnect", function (name) {
      // check if id is in list already
      let searchResult = fpjGhosties.find(ghosty => ghosty.id === socket.id);
      if (!searchResult) {
        console.log("ghosty not found on list, adding now")
        fpjGhosties.push(new FPJUser(socket, socket.id, name));
        console.log("fpj: Ghosty created with socket.id: " + socket.id);
        console.log(fpjGhosties);
        // for ghosty
        socket.emit("fpjNewHostyConnection", fpjHosty.id);
        // for hosty
        io.emit("fpjNewGhostyConnection", socket.id);
      }
    });


    // check for active ghosty
    socket.on("fpjHauntCheck", function () {
      console.log("checking for active ghosty");
      if (fpjGhosty) {
        // active haunter
        socket.emit("fpjYesActiveGhosty", fpjGhosty.name);
      } else {
        // josh is free to be haunted
        socket.emit("fpjNoActiveGhosty");
      }
    });

    // new active ghosty bid
    socket.on("fpjNewActiveGhosty", function (ghostName) {
      console.log("new active ghosty bid");
      if (fpjGhosty) {
        // active haunter
        console.log("there is already an active ghosty");
        socket.emit("fpjYesActiveGhosty", fpjGhosty.name);
      } else {
        let searchResult = fpjGhosties.find(ghosty => ghosty.id === socket.id);
        console.log(searchResult);
        if (searchResult) {
          fpjGhosty = searchResult;
          fpjGhosty.name = ghostName;
          console.log("setting new active ghosty", fpjGhosty.id);
          // send ping to everyone else to update their controls
          console.log("sending start ping");
          io.emit("fpjStartActiveGhosty", fpjGhosty.id, fpjGhosty.name);
        }
      }
    });

    // end active ghosty session
    socket.on("fpjEndActiveGhosty", function () {
      console.log("active ghosty is unhaunting");
      fpjGhosty = null;
      io.emit("fpjNoActiveGhosty");
    });

    // simple peer signalling
    socket.on("fpjSignal", (to, from, data) => {
      console.log("fpj SIGNAL", to, data);
      // socket.broadcast.emit("fpjSignal", to, from, data);
      let searchResult = fpjGhosties.find(ghosty => ghosty.id === to);
      if (searchResult) {
        console.log("Found Ghosty in the list, sending signal");
        searchResult.socket.emit("fpjSignal", to, from, data);
      } else if (fpjHosty.id == to) {
        console.log("Found Hosty, sending signal");
        fpjHosty.socket.emit("fpjSignal", to, from, data);
      } else {
        console.log("couldn't send signal ghosty or hosty :(");
      }
    });

    // disconnect
    socket.on("disconnect", function () {
      console.log("Client has disconnected");
      io.emit("disconnected", socket.id);
      // if socket.id is Hosty, then delete hosty
      if (fpjHosty) {
        if (fpjHosty.id == socket.id) {
          fpjHosty = null;
          fpjGhosty = null;
          console.log("fpj: Josh disconnected, fpjHosty and fpjGhosty cleared");
          io.emit("fpjHostyDisconnect", socket.id);
        }
      }
      // same for ghosty
      let searchResult = fpjGhosties.find(ghosty => ghosty.id === socket.id);
      if (searchResult) {
        console.log("fpj: audience member disconnected", searchResult.id);
        fpjGhosties = fpjGhosties.filter(ghosty => ghosty.id !== searchResult.id);
        io.emit("fpjGhostyDisconnect", socket.id);
      }
      // same for active ghosty
      if (fpjGhosty) {
        if (fpjGhosty.id == socket.id) {
          fpjGhosty = null;
          console.log("fpj: active ghosty disconnected, fpjGhosty cleared");
          io.emit("fpjNoActiveGhosty");
        }
      }
    });
  }
);

class FPJUser {
  constructor(socket, socket_id, name) {
    this.socket = socket;
    this.id = socket_id;
    this.name = name;
  }
}

let fpjHosty = null;
let fpjGhosty = null; // ACTIVE ghosty
let fpjGhosties = [];
// END of FPJ code


// // commented out for local testing
// // for conndev
// const mqtt = require("mqtt");
// const client = mqtt.connect("mqtt://test.mosquitto.org");
// const path = "./public/conndev/itpee/log.json";
// const stream = fs.createWriteStream(path, { flags: "a" });

// client.on("connect", function () {
//   client.subscribe("conndev/joshjoshjosh", function (err) {
//     if (!err) {
//       //   client.publish('conndev/joshjoshjosh', 'server subscribed to conndev/joshjoshjosh')
//     }
//   });
// });

// client.on("message", function (topic, message) {
//   // message is Buffer
//   let toLogText = message.toString();
//   console.log(toLogText);
//   stream.write(toLogText + "\n");
//   //   client.end()
// });

// client.on("error", (error) => {
//   console.error(error);
//   // process.exit(1);
// });
