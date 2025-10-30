const mongoose = require('mongoose');

// Define schema
const addressSchema = new mongoose.Schema({
    pincode: {
        type: Number,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    country:{
        type: String,
        required: true
    }
});

// Compile model from schema
const Address = mongoose.model('address', addressSchema);

module.exports = Address;