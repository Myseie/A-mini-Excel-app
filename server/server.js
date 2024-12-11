const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const mongoURI = 'mongodb://localhost:27017/spredsheet';

mongoose.connect(mongoURI)
    .then(() => console.log('Ansluten till MongoDB'))
    .catch(err => console.error('Kunde inte ansluta till MongoDB:', err));

mongoose.connection.on('error', (err) => {
    console.error('MongoDB-anslutningsfel:', err);
});

const cellSchema = new mongoose.Schema({
    row: Number,
    column: Number,
    value: String,
});

const Cell = mongoose.model('Cell', cellSchema);

app.get('/api/cells', async (req, res) => {
    try {
        const cells = await Cell.find();
    res.json(cells);
    } catch (error) {
        console.error('Fel vid hämtning av celler:', error);
        res.status(500).json({error: 'Serverfel vid hämtning av celler'});
    }
});

app.post('/api/cells', async (req,res) => {
    try {
        const { row, column, value } = req.body;

    let cell = await Cell.findOne({ row, column});
    if(cell) {
        cell.value = value;
    } else {
        cell = new Cell({ row, column, value});
    }
    await cell.save();

    res.json(cell);
    } catch (error) {
        console.error('Fel vid uppdatering av cell:', error);
        res.status(500).json({ error: 'Serverfel vid uppdatering av cell' });
    }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Servern körs på port ${PORT}`));