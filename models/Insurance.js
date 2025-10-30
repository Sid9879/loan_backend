const mongoose = require('mongoose');

const Insurance = new mongoose.Schema({
    user:{
         type: mongoose.Schema.Types.ObjectId,
                ref:"user",
                required:[true,"user id is required"]
    },
    name:{
      type:String,
      required:[true,'name is required']
    },
    mobile:{
        type:Number,
        required:[true,'mobile no. is required']
    },
    address:{
        address:{
            type:String,
            required:[true,'address is required']
        },
        locality:{
            type:String,
            required:[true,'locality is required']
        },
        city:{
            type:String,
            required:[true,'city is required']

        },
         district:{
            type:String,
            required:[true,'district is required']

        },
        zip:{
            type:Number,
            required:[true,'city is required']

        },

    },

status: [
  {
    state: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default:'pending',
      required: true
    },
    remarks: [
      {
        note: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
  }
],

agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user" 
  },

createdAt: { type: Date, default: Date.now }, 


},{timestamps:true});
Insurance.index({name:"text"})


module.exports = mongoose.model('insurance',Insurance)