import dotenv from 'dotenv';
dotenv.config({ path: './secrets.env' });

const apiKey = process.env.API_KEY;var socket;
var myHostyPeer;
let isActiveGhosty = false;
let joshIsBusy = false;
let connectedToVideoStream = false;
let statusText;
var turnServers = {};
let countdownInterval;
let endHauntTimeout;
let lastKey = null;
let hostyCam;
let mystream;
let clientType;

// on window load

window.addEventListener("load", async function () {

  await initCapture();
  await fetchTurnServers();
  enableEnterKey();
  initiateClickableKeys();
  statusText = document.getElementById("statusText");
  hostyCam = document.getElementById("hostyCam");

  clientType = getQueryParam("client");
  if (clientType === "arcade") {
    document.getElementById("ghostNameInput").value = "Gamer Ghosty";
    enableStartButton();
  }

  // socket.io things
  socket = io.connect();

  socket.on("connect", function () {
    console.log("Connected");
    socket.emit("fpjHostyCheck");
  });

  setupSocketCallbacks();
});

// SOCKET CALLBACKS
function setupSocketCallbacks() {
  socket.on("fpjSignal", function (to, from, data) {
    console.log("Got a signal from the server: ", to, from, data);
    if (myHostyPeer.socket_id == from) {
      myHostyPeer.inputsignal(data);
    } else {
      console.log("signal couldn't find peer");
    }
  });

  // catch if there is no hosty
  socket.on("fpjNoHosty", function () {
    console.log("oops there's no hosty");
    statusText.innerHTML = "Josh is OFFLINE, please try again later";
    document.getElementById("loading").style.display = "none";
    hideGhostyConnectOptions();
  });

  socket.on("fpjYesHosty", function (hostyID) {
    console.log("yay there's a hosty with id " + hostyID);
    statusText.innerHTML = "Josh is ONLINE, loading stream...";
    document.getElementById("loading").style.display = "block";
    // load p2p stream
    console.log("getting video from hosty...");
    socket.emit("fpjGhostyConnect", "");
  });

  socket.on("fpjNewHostyConnection", function (hostyID) {
    console.log("connected to hosty " + hostyID);
    // start video stream
    myHostyPeer = new SimplePeerWrapper(false, hostyID, socket);
    statusText.innerHTML = "Checking who is haunting Josh..";
    // check if hosty is currently haunted
    socket.emit("fpjHauntCheck");
  });

  socket.on("fpjYesActiveGhosty", function (ghostName) {
    console.log("the hosty has an active ghosty already");
    joshIsBusy = true;
    statusText.innerHTML =
      "Josh is being haunted by " + ghostName;
    hideGhostyConnectOptions();
  });

  socket.on("fpjNoActiveGhosty", function () {
    hideGhostyUI();
    console.log("no active ghosty, free to haunt");
    joshIsBusy = false;
    isActiveGhosty = false;
    statusText.innerHTML = "Josh is ONLINE and being a generally cool dude";
    // this is for when someone else disconnects
    if (connectedToVideoStream) {
      showGhostyConnectOptions();
    }
  });

  socket.on("fpjStartActiveGhosty", function (id, name) {
    if (socket.id == id) {
      isActiveGhosty = true;
      document.getElementById("ghostName").innerHTML = document.getElementById("ghostNameInput").value;
      statusText.innerHTML = "YOU are haunting Josh! You have 30 seconds!";
      updateSpeechBubble("(this is what Josh hears)");
      showGhostyUI();
      // Set a 30-second timer
      let countdown = 30;
      countdownInterval = setInterval(() => {
        countdown--;
        statusText.innerHTML = `YOU are haunting Josh! You have ${countdown} seconds!`;
        if (countdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      endHauntTimeout = setTimeout(() => {
        statusText.innerHTML = "Your haunting session has ended.";
        socket.emit("fpjEndActiveGhosty");
      }, 31000);
    } else {
      joshIsBusy = true;
      statusText.innerHTML =
        "Josh is being haunted by " + name;
      hideGhostyConnectOptions();
    }
  });

  socket.on('fpjHostyDisconnect', function (data) {
    window.location.replace("/fpj/");
  });
}


// HELPER FUNCTIONS


function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

async function fetchTurnServers() {
  try {
    const response = await fetch(`https://fpj.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`);
    const iceServers = await response.json();
    turnServers = iceServers;
    console.log(turnServers);
  } catch (error) {
    console.error(error);
  }
}

function enableEnterKey() {
  let nameInput = document.getElementById("ghostNameInput");
  nameInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("hauntButton").click();
    }
  });
}

function enableStartButton() {
  console.log("enabling start button");
  document.addEventListener("keydown", function (event) {
    if (event.code === "Space") {
      console.log("space");
      event.preventDefault();
      hauntButtonHandler();
    }
  })
}

async function initCapture() {
  console.log("initCapture");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    mystream = stream;
  } catch (err) {
    alert(err);
  }
}

async function hauntButtonHandler() {
  if (!isActiveGhosty) {
    let ghostName = document.getElementById("ghostNameInput").value;
    if (ghostName.length > 0) {
      socket.emit("fpjNewActiveGhosty", ghostName);
    }
  } else {
    console.log("unhaunting");
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (endHauntTimeout) {
      clearTimeout(endHauntTimeout);
      endHauntTimeout = null;
    }
    socket.emit("fpjEndActiveGhosty");
  }

}

function hideGhostyConnectOptions() {
  let myelements = document.getElementsByClassName("onlyIfConnected");
  for (var i = 0; i < myelements.length; i++) {
    myelements.item(i).classList.add("hidden");
  }
}

function showGhostyConnectOptions() {
  let myelements = document.getElementsByClassName("onlyIfConnected");
  for (var i = 0; i < myelements.length; i++) {
    myelements.item(i).classList.remove("hidden");
  }
}

function showGhostyUI() {
  document.getElementById("loginUI").classList.add("hidden");
  document.getElementById("activeUI").classList.remove("hidden");
  initiateKeyboardControls(true);
}

function hideGhostyUI() {
  document.getElementById("loginUI").classList.remove("hidden");
  document.getElementById("activeUI").classList.add("hidden");
  initiateKeyboardControls(false);
}

function initiateKeyboardControls(bool) {
  if (bool) {
    document.addEventListener("keydown", keyDownHandler);
  } else {
    document.removeEventListener("keydown", keyDownHandler);
  }
}

function keyDownHandler(event) {
  if (event.repeat && event.key === lastKey) {
    event.preventDefault();
  }
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(
      event.code
    ) > -1
  ) {
    event.preventDefault();
  }
  if (event.defaultPrevented) {
    return;
  }
  lastKey = event.key;
  let instructionString;
  switch (event.code) {
    case "KeyS":
      instructionString = "backward";
      break;
    case "KeyW":
      instructionString = "forward";
      break;
    case "KeyA":
      instructionString = "left";
      break;
    case "KeyD":
      instructionString = "right";
      break;
    case "ArrowDown":
      instructionString = "Look down";
      break;
    case "ArrowUp":
      instructionString = "Look up";
      break;
    case "ArrowLeft":
      instructionString = "Look left";
      break;
    case "ArrowRight":
      instructionString = "Look right";
      break;
    case "KeyJ":
      instructionString = "interact";
      break;
    case "KeyK":
      instructionString = "hold";
      break;
    case "KeyL":
      if (clientType === "arcade") {
        updateSpeechBubble("(voice not available in arcade mode)")
      } else {
        startSpeechRecognition();
      }
      break;
    default:
      instructionString = "";
  }
  if (instructionString) {
    myHostyPeer.send(instructionString);
    updateSpeechBubble(instructionString);
  }
}

function initiateClickableKeys() {
  document.getElementById('up').addEventListener('click', buttonClickHandler);
  document.getElementById('left').addEventListener('click', buttonClickHandler);
  document.getElementById('right').addEventListener('click', buttonClickHandler);
  document.getElementById('down').addEventListener('click', buttonClickHandler);
  document.getElementById('a-button').addEventListener('click', buttonClickHandler);
  document.getElementById('b-button').addEventListener('click', buttonClickHandler);
  document.getElementById('c-button').addEventListener('click', buttonClickHandler);
}

function buttonClickHandler(event) {
  const buttonId = event.target.id;
  let instructionString;
  switch (buttonId) {
    case 'up':
      instructionString = 'forward';
      break;
    case 'left':
      instructionString = 'left';
      break;
    case 'right':
      instructionString = 'right';
      break;
    case 'down':
      instructionString = 'backward';
      break;
    case 'a-button':
      instructionString = "interact";
      break;
    case 'b-button':
      instructionString = "hold";
      break;
    case 'c-button':
      if (clientType === "arcade") {
        updateSpeechBubble("(voice not available in arcade mode)")
      } else {
        startSpeechRecognition();
      }
      break;
    default:
      instructionString = '';
  }
  if (instructionString) {
    // console.log(instructionString);
    myHostyPeer.send(instructionString);
    updateSpeechBubble(instructionString);
  }
}

function startSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window)) {
    alert('Your browser does not support speech recognition. Please use Chrome.');
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = function () {
    console.log('Speech recognition started. Listening for 5 seconds...');
    // statusText.innerHTML = 'Listening...';
    updateSpeechBubble("(listening...)", true);
  };

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    console.log('Transcribed text:', transcript);
    const instructionString = transcript;
    myHostyPeer.send(instructionString);
    updateSpeechBubble(instructionString);
  };

  recognition.onerror = function (event) {
    console.error('Speech recognition error:', event.error);
    updateSpeechBubble('(error: ' + event.error + ")");
  };

  recognition.onend = function () {
    console.log('Speech recognition ended.');
    // updateSpeechBubble('(done listening...)');
  };

  recognition.start();
  // Stop recognition after 5 seconds
  setTimeout(() => {
    recognition.stop();
  }, 5000);
}

function updateSpeechBubble(data, unanimated) {
  console.log("new instruction: " + data);
  let displayText = document.getElementById("displayMessageText");
  displayText.innerHTML = data;
  let displayTextBubble = document.getElementById("ghostbubbleandtext");
  displayTextBubble.style.animation = "none"; // Reset animation
  displayTextBubble.offsetHeight; // Trigger reflow
  if (!unanimated) {
    displayTextBubble.style.animation = "instrFade 2s forwards"; // Apply animation
  }
}


// CLASSES


class SimplePeerWrapper {
  constructor(initiator, socket_id, socket) {

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
    });

    this.socket_id = socket_id;
    this.socket = socket;
    // simplepeer generates signals which need to be sent across socket
    this.simplepeer.on("signal", (data) => {
      console.log("emitting simplepeer signal");
      this.socket.emit("fpjSignal", this.socket_id, this.socket.id, data);
    });

    // When we have a connection, send our stream
    this.simplepeer.on("connect", () => {
      console.log("CONNECTED to Peer");
      // console.log(this.simplepeer);
    });

    // Stream coming in to us
    this.simplepeer.on("stream", (stream) => {
      console.log("Incoming Stream");

      if ("srcObject" in hostyCam) {
        hostyCam.srcObject = stream;
      } else {
        hostyCam.src = window.URL.createObjectURL(stream); // for older browsers
      }
      hostyCam.onloadedmetadata = function (e) {
        console.log("incoming camera loaded");
        document.getElementById("loading").style.display = "none";
        hostyCam.play();
        if (!joshIsBusy) {
          showGhostyConnectOptions();
        }
        connectedToVideoStream = true;
        mystream.getTracks().forEach(track => track.stop());
      };
      // console.log(hostyCam.srcObject);
    });

    this.simplepeer.on("close", () => {
      console.log("Got close event");
      window.location.replace("/fpj/");
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