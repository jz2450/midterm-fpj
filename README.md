# midterm-fpj (First Person Josh)

This web app allows you (a ghosty) to control another person (a hosty) through a live web interface. You see what Josh is seeing, you tell Josh what to do.

These files must be run in conjuction with a Node server running Socket.io, SimplePeer, and Express (httpsserver.js).

Full documentation: https://joshjoshjosh.notion.site/FPJ-Reloaded-The-Final-Project-60b82d217d024e86ac1522199d7096d0


## changes made to this version:
- added voice instructions for josh
- created new outward facing screen for josh
- move messages and data to peer to peer
- disappearing ghosty bubble on controller
- turns off the camera when josh is off the clock
- replaced all svgs with linked files
- video loading screen
- responsive mobile version with clickable buttons
- request mic after login
- qr code on josh
- one way streams 
- wait for josh to approve camera before connecting
- observer mode -> active ghosty!
- wait for camera to load before allowing text input
- android support
- countdown timers
- figure out speak function, no audio streams
- arcade kiosk mode

## todo
- figure out the secrets thing
- deploy on digital ocean
- android text to speech?? check with new ssl, or request permission again
- client performance
- video connection unrealiable on boot
- update ssl on droplet

### nice to haves
- add ml5 object detection to controller view