import { Ambient } from "./jogg.js";

let myGhostyPeers = [];
var mystream;
var socket;
var turnServers = {};
let isClockedIn;
let clockInButton;
let ambientPlayer = new Ambient();
let soundSheet = {
  idleMusic: "./assets/mii-channel.mp3",
  activeMusic: "./assets/wii-shop-channel.mp3"
}


// on window load


window.addEventListener("load", async function () {
  clockInButton = document.getElementById("clockInButton");
  clockInButton.addEventListener('click', toggleClockIn);
  // Fetch TURN servers
  await fetchTurnServers();
  // Load ambient sounds
  await ambientPlayer.load(soundSheet);
  // socket.io things
  socket = io.connect();
  socket.on("connect", function () {
    console.log("Connected");
  });
  setupSocketCallbacks();
});


// SOCKET CALLBACKS

function setupSocketCallbacks() {
  // socket callbacks
  socket.on("fpjNoHosty", function () {
    isClockedIn = false;
  });

  socket.on("fpjHostyConfirm", function () {
    // if not clocked in
    isClockedIn = true;
    clockInButton.innerHTML = "Clock Out";
    ambientPlayer.start("idleMusic");
    speakText("josh has clocked in");
    socket.emit("fpjHostyPing");
    socket.emit("fpjGhostyCheck");
    document.getElementById("idleScreen").classList.add("hidden");
    let myelements = document.getElementsByClassName("onlyIfConnected");
    for (var i = 0; i < myelements.length; i++) {
      myelements.item(i).classList.remove("hidden");
    }
  });

  // this shouldn't happen but I should make this work for futureproofing
  //catch double up connections
  socket.on("fpjHostyDoubleUp", function () {
    // decide what to do with double up joshes
    console.log("host is already connected, redirecting...");
    window.location.replace("../");
  });


  // Receive connection request from server
  socket.on("fpjNewGhostyConnection", function (ghostyID) {
    // data = {id: string, ghostName: string}
    if (ghostyID != socket.id) {
      // create a new simplepeer and we'll be the "initiator"
      myGhostyPeers.push(new SimplePeerWrapper(true, ghostyID, socket, mystream));
      // myGhostyPeer = new SimplePeerWrapper(true, ghostyID, socket, mystream);
      console.log("new ghosty connected: " + ghostyID);
      console.log("list of ghosts is now: ", myGhostyPeers);
    }
  });

  socket.on("fpjStartActiveGhosty", function (id, name) {
    document.getElementById("ghostName").innerHTML = name;
    ambientPlayer.start("activeMusic");
  });

  socket.on("fpjNoActiveGhosty", function() {
    document.getElementById("ghostName").innerHTML = "no one :&#40";
    ambientPlayer.start("idleMusic");
  });

  // when audience member disconnects
  socket.on("fpjGhostyDisconnect", function (data) {
    console.log("ghosty has disconnected: " + data);
    console.log("ghosties before disconnect: ", myGhostyPeers);
    myGhostyPeers = myGhostyPeers.filter(ghosty => ghosty.socket_id !== data);
    console.log("remaining ghosties: ", myGhostyPeers);
  });

  socket.on("disconnect", function (data) {
    console.log("Socket disconnected");
  });

  socket.on("disconnected", function (data) {
    console.log("ghosty disconnected");
    // myGhostyPeers = myGhostyPeers.filter(ghosty => ghosty.id === data);
  });

  socket.on("fpjNewInstruction", function (data) {
    console.log("new instruction: " + data);
    speakText(data);
  });

  socket.on("fpjSignal", function (to, from, data) {
    console.log("Got a signal from the server: ", to, from, data);
    let searchResult = myGhostyPeers.find(ghostyPeer => ghostyPeer.socket_id === from);
    if (searchResult) {
      searchResult.inputsignal(data);
    } else {
      console.log("signal couldn't find peer");
    }
  });
}


// HELPER FUNCTIONS


// Fetch environment variables from the server
async function fetchEnvVariables() {
  try {
    const response = await fetch('/api/env');
    const env = await response.json();
    return env;
  } catch (error) {
    console.error('Error fetching environment variables:', error);
  }
}

function speakText(data) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(data);
    window.speechSynthesis.speak(utterance);
  } else {
    console.error("Speech Synthesis not supported in this browser.");
  }
}

async function fetchTurnServers() {
  try {
    const env = await fetchEnvVariables();
    const apiKey = env.apiKey;
    const response = await fetch(`https://fpj.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`);
    const iceServers = await response.json();
    turnServers = iceServers;
    console.log(turnServers);
  } catch (error) {
    console.error(error);
  }
}

async function toggleClockIn() {
  if (!isClockedIn) {
    await initCapture();
    socket.emit("fpjHostyConnect");
    console.log("clock in button toggled");
  } else {
    // if clocked in
    isClockedIn = false;
    clockInButton.innerHTML = "Clock In";
    ambientPlayer.stop();
    speakText("josh has clocked out");
    document.getElementById("idleScreen").classList.remove("hidden");
    let myelements = document.getElementsByClassName("onlyIfConnected");
    for (var i = 0; i < myelements.length; i++) {
      myelements.item(i).classList.add("hidden");
    }
    socket.emit("fpjHostyDisconnect");
    if (mystream) {
      mystream.getTracks().forEach(track => track.stop());
      console.log("Stream paused");
    }
  }

}

async function initCapture() {
  console.log("initCapture");
  // camera selecting
  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then(function () {
      if (!navigator.mediaDevices?.enumerateDevices) {
        console.log("enumerateDevices() not supported.");
      } else {
        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            // devices.forEach(device => {
            //   console.log(device.label);
            // });
            // Choosing the front-facing camera
            var ioscamera = devices.find(
              (device) => device.label.toLowerCase().includes("front")
            );
            var andcamera = devices.find(
              (device) => device.label.toLowerCase().includes("facing front")
            );
            if (ioscamera) {
              // choosing the built in mic for iPhones
              var iosmicrophone = devices.find(
                (device) => device.label.toLowerCase().includes("microphone")
              );
              var audioConstraints = {
                deviceId: iosmicrophone.deviceId,
              }
              var constraints = {
                deviceId: ioscamera.deviceId,
              };
              return navigator.mediaDevices.getUserMedia({
                audio: true,
                video: constraints,
              });
            } else if (andcamera) {
              var constraints = {
                deviceId: andcamera.deviceId,
              };
              return navigator.mediaDevices.getUserMedia({
                audio: true,
                video: constraints,
              });
            } else {
              return navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                  facingMode: "environment",
                },
              });
            }
          })
          .then(function (stream) {
            mystream = stream;
            // finishSetupSocket();
          })
          .catch(function (err) {
            /* Handle the error */
            alert(err);
          });
      }
    })
    .catch(function (err) {
      /* Handle the error */
      alert(err);
    });
}

// CLASSES

// A wrapper for simplepeer as we need a bit more than it provides
class SimplePeerWrapper {
  constructor(initiator, socket_id, socket, stream) {

    this.simplepeer = new SimplePeer({
      config: {
        // // uncomment to use Google servers
        //     iceServers: [
        //       { urls: "stun:stun.l.google.com:19302" },
        //       { urls: "stun:stun2.l.google.com:19302" },
        //     ],
        // // uncomment to use Metered.ca servers
        iceServers: turnServers,
      },
      initiator: initiator,
      trickle: false,
      stream: stream,
      offerOptions: {
        offerToReceiveVideo: false,
        offerToReceiveAudio: false
      }
    });

    // Their socket id, our unique id for them
    this.socket_id = socket_id;
    // Socket.io Socket
    this.socket = socket;
    // Our video stream - need getters and setters for this
    this.stream = stream;
    // simplepeer generates signals which need to be sent across socket
    this.simplepeer.on("signal", (data) => {
      console.log("emitting simplepeer signal");
      this.socket.emit("fpjSignal", this.socket_id, this.socket.id, data);
    });
    // When we have a connection, send our stream
    this.simplepeer.on("connect", () => {
      console.log("CONNECTED to Peer");
      console.log(this.simplepeer);

      // // Let's give them our stream
      // this.simplepeer.addStream(stream);
      // console.log("Send our stream");
    });

    // Data coming in to us
    this.simplepeer.on("data", data => {
      console.log('Received message:', data.toString());
      speakText(data.toString());
    });

    this.simplepeer.on("close", () => {
      console.log("Got close event");

    });

    this.simplepeer.on("error", (err) => {
      console.log(err);
    });
  }

  send(data) {
    this.simplepeer.send(data);
  }

  inputsignal(sig) {
    this.simplepeer.signal(sig);
  }
}