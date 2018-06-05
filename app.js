const 	express = require('express')
		bodyParser = require('body-parser')
		fs = require('fs');
		mjpegCamera = require('mjpeg-camera');
		clarifai = require('clarifai');

// Express App
const app = express();

// support json encoded bodies
app.use(bodyParser.json());
// support (other) encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// initialise routes
app.use('/api', require('./routes/api.js'));

// error handling middleware
app.use(function(err, req, res, next){
	// console.log(err);
	res.status(422).send( {error: err.message} );
});

//Listen for requests
app.listen(process.env.port || 80, function(){
	console.log("Now listening for requests.");
});

// function to encode file data to base64 encoded string
function base64_encode(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}

// ======================================================================================================
// Bluetooth connection to arduino (RC car)
// ======================================================================================================
var btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();
var bluetoothConnected = false;

function connectToArduino(name, address) {
	console.log('('+name+') Trying to find serial port channel... ['+address+']');

	btSerial.findSerialPortChannel(address, function(channel) {
		console.log('Found port channel: '+channel);
		console.log('- Tying to connect...');

		btSerial.connect(address, channel, function() {
			console.log('connected: ', address);
			bluetoothConnected = true;

			btSerial.write(new Buffer('Node server connected!\n', 'utf-8'), function(err, bytesWritten) {
				if (err) console.log(err);
			});

			btSerial.on('data', function(buffer) {
				console.log(buffer.toString('utf-8'));
			});
		}, function () {
			console.log('cannot connect, retrying...');
			connectToArduino('HC-05', '98:D3:32:31:54:1B');
		});

		// close the connection when you're ready
		btSerial.close();
	}, function() {
		console.log('cannot find port channel, retrying...');
		connectToArduino('HC-05', '98:D3:32:31:54:1B');
	});
 
	btSerial.inquire();
}

connectToArduino('HC-05', '98:D3:32:31:54:1B');

// ======================================================================================================
// Clarifai API 
// ======================================================================================================
const ai = new Clarifai.App({
	apiKey: 'ef0061cb4c4c46899476c8c2a3eaf1f3'
});

// ======================================================================================================
// Camera snapshots
// ======================================================================================================
var camera = new mjpegCamera({ url: 'http://145.24.247.98:8080/video' });
var options = {
    delay: 1000 //in miliseconds
}

function takeSnapShot() {
    camera.getScreenshot(function(err, frame) {
        if (err) {console.error('- Failed to take snapshot - (Stream not found)')}
        else {
            fs.writeFileSync('./captures/droidcam.jpg', frame);
			console.log('- Took a snapshot -');

			ai.models.predict('vloer-blikje (forward/stop)', {base64: base64_encode('./captures/droidcam.jpg')}).then(
				function(response) {
					// Take the label name as command for the droid
					var command = response.outputs[0].data.concepts[0].name + '\n';
					console.log('CLARIFAI: ', command)
					
					// Send command to arduino serial
					btSerial.write(new Buffer(command, 'utf-8'), function(err, bytesWritten) {
						if (err) console.log(err);
					});

					takeSnapShot()
				},
				function(err) {
					// there was an error
					console.error('AI Error: ',err)
					takeSnapShot()
				}
			);
        }
    });
}

function checkBluetoothConnction() {
	setTimeout(function () {
		if (bluetoothConnected) {
			takeSnapShot()
		} else {
			//console.log('Bluetooth not connected yet...')
			checkBluetoothConnction();
		}
	}, 1000);
}

checkBluetoothConnction()