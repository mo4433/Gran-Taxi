const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const PORT = 30009;

// Skapa HTTP-server för både Express och Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.static('public')); // Serverar filer från mappen "public"




   // Denna rad hämtar länken från Render automatiskt
   const mongoURI = process.env.MONGO_URI;

    mongoose.connect(mongoURI)
    .then(() => console.log("Ansluten till MongoDB!"))
    .catch(err => console.error("Kunde inte ansluta:", err));

  // --- MODELL ---
  const Booking = mongoose.model('Booking', {
    start: String,
    destination: String,
    date: String,   // Lagt till för datum
    time: String,   // Lagt till för tid
    datum: { type: Date, default: Date.now } // Registreringsdatum
});

// --- ROUTES ---

// 1. Ta emot bokning (Kunden)
app.post('/boka', async (req, res) => {
    console.log("---> Ny bokning mottagen:", req.body);
    try {
        const nyBokning = new Booking({
            start: req.body.start,
            destination: req.body.destination,
            date: req.body.date,
            time: req.body.time
        });

        const sparad = await nyBokning.save();
        
        // Skicka till förare i realtid
        io.emit('ny_bokning', sparad);

        res.json({
            message: "Bokning bekräftad!",
            taxiId: "SV TAXI",
            ankomstTid: "5 minuter",
            bookingId: sparad._id // Skickar tillbaka ID så kunden kan avboka
        });
    } catch (err) {
        res.status(500).json({ error: "Kunde inte spara bokningen" });
    }
});

// 2. Hämta alla bokningar (Föraren)
app.get('/alla-bokningar', async (req, res) => {
    try {
        const alla = await Booking.find().sort({ datum: -1 });
        res.json(alla);
    } catch (err) {
        res.status(500).send("Kunde inte hämta bokningar");
    }
});

// 3. Avboka (Kunden)
app.delete('/avboka/:id', async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        console.log(`---> Bokning ${req.params.id} borttagen.`);
        res.status(200).send({ message: "Bokning borttagen" });
    } catch (err) {
        res.status(500).send(err);
    }
});

// --- SOCKET.IO (Karta/Position) ---

// --- SOCKET.IO (Karta/Position/Chatt) ---
io.on('connection', (socket) => {
    console.log('En användare anslöt:', socket.id);

    // 1. Hantera position
    socket.on('driver_pos', (coords) => {
        io.emit('update_map', coords);
    }); // <--- Denna stänger driver_pos korrekt

    // 2. Hantera chatt
    socket.on('chat_message', (data) => {
        console.log('Nytt meddelande:', data);
        io.emit('chat_message', data); 
    }); // <--- Denna stänger chat_message korrekt

}); // <--- Denna stänger hela io.on('connection')



// STARTA SERVERN - Lyssnar på alla nätverkskort (0.0.0.0)
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server körs!http://10.161.64.19 ${PORT}`);
});
const path = require('path');

// Startsidan (Bokning)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Bokning.html'));
});

// Förarsidan
app.get('/driver', (req, res) => {
    res.sendFile(path.join(__dirname, 'driver.html'));
});

