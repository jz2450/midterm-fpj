var socket;
var ghostyMicStream;
var myHostyPeer;
var isMuted = true;
var mystream;

// get turn servers
var turnServers = {};
(async () => {
  try {
    const response = await fetch("https://fpj.metered.live/api/v1/turn/credentials?apiKey=98bac8d8be959ecddea0203fe867c1da1b21");
    const iceServers = await response.json();
    turnServers = iceServers;
    console.log(turnServers);
  } catch (error) {
    console.error(error);
  }
})();

window.addEventListener("load", function () {
  textFieldEnterTriggerSetup();

  initCapture();

  // socket.io things
  socket = io.connect();

  socket.on("connect", function () {
    console.log("Connected");
    socket.emit("fpjHostyGhostyCheck");
  });

  // catch if someone is connected already, if so, hide input fields and haunt button
  // and change text on screen
  socket.on("fpjNoHosty", function () {
    console.log("oops there's no hosty");
    let statusText = document.getElementById("statusText");
    statusText.innerHTML = "OFFLINE, please try again later";
    hideGhostyConnectOptions();
  });

  socket.on("fpjGhostyDoubleUp", function () {
    console.log("oops the hosty has a ghosty already");
    let statusText = document.getElementById("statusText");
    statusText.innerHTML =
      "ONLINE but already haunted :( please try again later";
    hideGhostyConnectOptions();
  });

  socket.on("fpjYesHosty", function () {
    console.log("hosty has come online! :)");
    let statusText = document.getElementById("statusText");
    statusText.innerHTML = "ONLINE and ready to be haunted";
    showGhostyConnectOptions();
  });

  socket.on("fpjGhostyConnected", function (data) {
    console.log("connected to hosty " + data);
    document.getElementById("ghostName").innerHTML =
      document.getElementById("ghostNameInput").value;
    // console.log(mystream);
    let simplepeer = new SimplePeerWrapper(false, data, socket, mystream);
    myHostyPeer = simplepeer;
    showGhostyUI();
  });

  socket.on('fpjHostyDisconnect', function (data) {
    // if (data == myHostyPeer.socket_id) {
    //     window.location.replace("/fpj/");
    // }
    window.location.replace("/fpj/");
  });
});

function hauntHosty() {
  let ghostName = document.getElementById("ghostNameInput").value;
  if (ghostName.length > 0) {
    socket.emit("fpjGhostyConnect", ghostName);
  }
}

function unhaunt() {
  window.location.replace("/fpj/");
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

function initCapture() {
  console.log("initCapture");
  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: false,
    })
    .then(function (stream) {
      mystream = stream;
    })
    .catch(function (err) {
      alert(err);
    });
}

function showGhostyUI() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("main").classList.remove("hidden");
  initiateKeyboardControls();

  // handle more socket events
  socket.on("fpjNewInstruction", function (data) {
    console.log("new instruction: " + data);
    // document.getElementById("displayMessageText").innerHTML = data;
    let displayText = document.getElementById("displayMessageText");
    let newDisplayText = displayText.cloneNode(true);
    newDisplayText.innerHTML = data;
    newDisplayText.style.animation = "instrFade 2s forwards";
    displayText.parentNode.replaceChild(newDisplayText, displayText);
  });

  socket.on("fpjClearInstruction", function () {
    console.log("instruction cleared");
    document.getElementById("displayMessageText").innerHTML = "";
  });

  socket.on("fpjSignal", function (to, from, data) {
    console.log("Got a signal from the server: ", to, from, data);
    if (myHostyPeer.socket_id == from) {
      myHostyPeer.inputsignal(data);
    } else {
      console.log("signal couldn't find peer");
    }
  });
}

function textFieldEnterTriggerSetup() {
  // https://www.w3schools.com/howto/howto_js_trigger_button_enter.asp
  // Get the input field
  let nameInput = document.getElementById("ghostNameInput");
  // let messageInput = document.getElementById("ghostMessageInput");
  // Execute a function when the user presses a key on the keyboard
  nameInput.addEventListener("keypress", function (event) {
    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      document.getElementById("hauntButton").click();
    }
  });
}

function initiateKeyboardControls() {
  document.addEventListener("keydown", keyDownHandler);
  // document.addEventListener("keyup", keyUpHandler);
  // initClickableKeys();
}

function keyDownHandler(event) {
  // keysDown++;  
  // console.log(keysDown);
  if (event.defaultPrevented) {
    return;
  }
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(
      event.code
    ) > -1
  ) {
    event.preventDefault();
  }
  switch (event.code) {
    case "KeyS":
      socket.emit("fpjKeystroke", event.code);
      break;
    case "KeyW":
      socket.emit("fpjKeystroke", event.code);
      break;
    case "KeyA":
      socket.emit("fpjKeystroke", event.code);
      break;
    case "KeyD":
      socket.emit("fpjKeystroke", event.code);
      break;
    case "ArrowDown":
      socket.emit("fpjKeystroke", event.code);
      break;
    case "ArrowUp":
      socket.emit("fpjKeystroke", event.code);
      break;
    case "ArrowLeft":
      socket.emit("fpjKeystroke", event.code);
      break;
    case "ArrowRight":
      socket.emit("fpjKeystroke", event.code);
      break;
    case "KeyJ":
      socket.emit("fpjKeystroke", event.code);
      break;
    case "KeyK":
      socket.emit("fpjKeystroke", event.code);
      break;
    case "Space":
      ptsToggle();
      break;
  }
}

// function keyUpHandler(event) {
//   // don't think i need this anymore commenting to block out
//   // if (event.defaultPrevented) {
//   //   return;
//   // } else {
//   //   socket.emit("fpjClearInstruction");
//   // }
// }

function ptsToggle() {
  isMuted = !isMuted;
  let speakButton = document.getElementById("speak-button");
  if (isMuted) {
    speakButton.innerHTML = "📢 Push to speak 📢";
    speakButton.style.backgroundColor = "#22a737";
    console.log("muted");
  } else {
    speakButton.innerHTML = "🔇 Push to mute 🔇";
    speakButton.style.backgroundColor = "#ea4040";
    console.log("unmuted");
  }
  socket.emit("fpjMuteToggle", isMuted);
}

function initClickableKeys() {
  // ref: https://stackoverflow.com/a/44859462
  // hold/release
  let holdButton = document.getElementById('hold-release-button-legend');
  holdButton.style.cursor = "pointer";
  holdButton.addEventListener('mousedown', function () {
    var event = new KeyboardEvent('keydown', {
      code: 'KeyH',
    });
    // console.log(event);
    document.dispatchEvent(event);
  });
  holdButton.addEventListener('mouseup', function () {
    var event = new KeyboardEvent('keyup');
    document.dispatchEvent(event);
  });
  // interact
  let intButton = document.getElementById('interact-button-legend');
  intButton.style.cursor = "pointer";
  intButton.addEventListener('mousedown', function () {
    var event = new KeyboardEvent('keydown', {
      code: 'KeyJ',
    });
    document.dispatchEvent(event);
  });
  intButton.addEventListener('mouseup', function () {
    var event = new KeyboardEvent('keyup');
    document.dispatchEvent(event);
  });
  // moving
  // up
  let wButton = document.getElementById('W Button');
  wButton.style.cursor = "pointer";
  wButton.addEventListener('mousedown', function () {
    var event = new KeyboardEvent('keydown', {
      code: 'KeyW',
    });
    document.dispatchEvent(event);
  });
  wButton.addEventListener('mouseup', function () {
    var event = new KeyboardEvent('keyup');
    document.dispatchEvent(event);
  });
  // down
  let sButton = document.getElementById('S Button');
  sButton.style.cursor = "pointer";
  sButton.addEventListener('mousedown', function () {
    var event = new KeyboardEvent('keydown', {
      code: 'KeyS',
    });
    document.dispatchEvent(event);
  });
  sButton.addEventListener('mouseup', function () {
    var event = new KeyboardEvent('keyup');
    document.dispatchEvent(event);
  });
  // left
  let aButton = document.getElementById('A Button');
  aButton.style.cursor = "pointer";
  aButton.addEventListener('mousedown', function () {
    var event = new KeyboardEvent('keydown', {
      code: 'KeyA',
    });
    document.dispatchEvent(event);
  });
  aButton.addEventListener('mouseup', function () {
    var event = new KeyboardEvent('keyup');
    document.dispatchEvent(event);
  });
  // right
  let dButton = document.getElementById('D Button');
  dButton.style.cursor = "pointer";
  dButton.addEventListener('mousedown', function () {
    var event = new KeyboardEvent('keydown', {
      code: 'KeyD',
    });
    document.dispatchEvent(event);
  });
  dButton.addEventListener('mouseup', function () {
    var event = new KeyboardEvent('keyup');
    document.dispatchEvent(event);
  });
  // camera
  // up
  let upButton = document.getElementById('up-button');
  upButton.style.cursor = "pointer";
  upButton.addEventListener('mousedown', function () {
    var event = new KeyboardEvent('keydown', {
      code: 'ArrowUp',
    });
    document.dispatchEvent(event);
  });
  upButton.addEventListener('mouseup', function () {
    var event = new KeyboardEvent('keyup');
    document.dispatchEvent(event);
  });
  // down
  let downButton = document.getElementById('down-button');
  downButton.style.cursor = "pointer";
  downButton.addEventListener('mousedown', function () {
    var event = new KeyboardEvent('keydown', {
      code: 'ArrowDown',
    });
    document.dispatchEvent(event);
  });
  downButton.addEventListener('mouseup', function () {
    var event = new KeyboardEvent('keyup');
    document.dispatchEvent(event);
  });
  // left
  let leftButton = document.getElementById('left-button');
  leftButton.style.cursor = "pointer";
  leftButton.addEventListener('mousedown', function () {
    var event = new KeyboardEvent('keydown', {
      code: 'ArrowLeft',
    });
    document.dispatchEvent(event);
  });
  leftButton.addEventListener('mouseup', function () {
    var event = new KeyboardEvent('keyup');
    document.dispatchEvent(event);
  });
  // right
  let rightButton = document.getElementById('right-button');
  rightButton.style.cursor = "pointer";
  rightButton.addEventListener('mousedown', function () {
    var event = new KeyboardEvent('keydown', {
      code: 'ArrowRight',
    });
    document.dispatchEvent(event);
  });
  rightButton.addEventListener('mouseup', function () {
    var event = new KeyboardEvent('keyup');
    document.dispatchEvent(event);
  });
}

// A wrapper for simplepeer as we need a bit more than it provides
class SimplePeerWrapper {
  constructor(initiator, socket_id, socket, stream) {

    this.simplepeer = new SimplePeer({
      config: {
        iceServers: turnServers,
      },
      initiator: initiator,
      trickle: false,
    });

    // this.simplepeer = new SimplePeer({
    //   config: {
    //     iceServers: [
    //       { urls: "stun:stun.l.google.com:19302" },
    //       { urls: "stun:stun2.l.google.com:19302" },
    //     ],
    //   },
    //   initiator: initiator,
    //   trickle: false,
    // });

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

      // Let's give them our stream
      this.simplepeer.addStream(stream);
      console.log("Send our stream");
    });

    // Stream coming in to us
    this.simplepeer.on("stream", (stream) => {
      console.log("Incoming Stream");
      let hostyCam = document.getElementById("hostyCam");
      if ("srcObject" in hostyCam) {
        hostyCam.srcObject = stream;
      } else {
        hostyCam.src = window.URL.createObjectURL(stream); // for older browsers
      }
      hostyCam.onloadedmetadata = function (e) {
        hostyCam.play();
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

  inputsignal(sig) {
    this.simplepeer.signal(sig);
  }
}
