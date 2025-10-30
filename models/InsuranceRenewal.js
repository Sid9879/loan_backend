const mongoose = require('mongoose');
const InsuranceRenewal = new mongoose.Schema({
    insuranceNumber:{
      type:String
    },
    expiryDate:{
        type:Date
    },
    oldImage:{
        type:String
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
    agent:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    }
},{timestamps:true});

module.exports = mongoose.model("InsuranceRenewal",InsuranceRenewal);