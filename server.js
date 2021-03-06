const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const EventHubReader = require('./scripts/event-hub-reader');
const DatabaseWriter = require('./scripts/db');

const iotHubConnectionString = "HostName=CarCognitionHub.azure-devices.net;SharedAccessKeyName=service;SharedAccessKey=qiLmgBCZHORrBQ9RIRHkllZ3bl+zdXaHM+x4imF3zSk=";
const eventHubConsumerGroup = process.env.eventHubConsumerGroup;

const app = express();
app.use(express.static(path.join(__dirname, 'build')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        console.log(`Broadcasting data ${data}`);
        client.send(data);
      } catch (e) {
        console.error(e);
      }
    }
  });
};

const port = process.env.PORT || 1337;
server.listen(port, () => {
  console.log(`Listening on port ${server.address().port}`);
});

const eventHubReader = new EventHubReader(iotHubConnectionString, eventHubConsumerGroup);
// const databaseWriter = new DatabaseWriter();
// databaseWriter.connectDB()
//   .then(mes => console.log(mes))
//   .catch(err => console.error(err));

(async () => {
  await eventHubReader.startReadMessage(async (message, date, deviceId) => {
    try {
      const payload = {
        IotData: message,
        MessageDate: date || Date.now().toISOString(),
        DeviceId: deviceId,
      };

      console.log(payload);
      // await databaseWriter.writeData(payload.IotData);
      wss.broadcast(JSON.stringify(payload));
    } catch (err) {
      // console.error('Error broadcasting: [%s] from [%s].', err, message);
    }
  });
})().catch();
