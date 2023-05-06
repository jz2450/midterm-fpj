var socket;
var ghostyMicStream;
var myHostyPeer;
var isMuted = true;
var mystream;

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

  socket.on('fpjHostyDisconnect', function(data) {
    // if (data == myHostyPeer.socket_id) {
    //     window.location.replace("/");
    // }
    window.location.replace("/");
  });
});

function hauntHosty() {
  let ghostName = document.getElementById("ghostNameInput").value;
  if (ghostName.length > 0) {
    socket.emit("fpjGhostyConnect", ghostName);
  }
}

function unhaunt() {
  window.location.replace("/");
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
    document.getElementById("displayMessageText").innerHTML = data;
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
  document.addEventListener("keyup", keyUpHandler);
}

function keyDownHandler(event) {
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
    case "KeyH":
      socket.emit("fpjKeystroke", event.code);
      break;
  }
}

function keyUpHandler(event) {
  if (event.defaultPrevented) {
    return;
  } else {
    socket.emit("fpjClearInstruction");
  }
}

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

// A wrapper for simplepeer as we need a bit more than it provides
class SimplePeerWrapper {
  constructor(initiator, socket_id, socket, stream) {
    this.simplepeer = new SimplePeer({
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      },
      initiator: initiator,
      trickle: false,
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
      window.location.replace("/");
    });

    this.simplepeer.on("error", (err) => {
      console.log(err);
    });
  }

  inputsignal(sig) {
    this.simplepeer.signal(sig);
  }
}
