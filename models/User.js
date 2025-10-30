const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  avatar: {
    type: String
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
  },
  mobile: {
    type: String,
    unique: [true, 'phone no. already exists'],

  },
  dob:{
    type:Date,
  },
  gender:{
    type:String,
    enum:['male','female','other']
  },
  password: {
    type: String,
  },
  role: {
    type: String,
    enum:['agent','customer'],
    default:"customer"
  },
  id:{
    type:String,
    unique:true,
  },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  otp: [{
    otp: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isBlocked: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
address:{
    state:{
      type:String,
    },
    zip:{
      type:Number,
    },
    street:{
      type:String
    },
    country:{
      type:String,
    }
},
alternateMobile:{
    type:Number,
},
  wallet: {
    type:Number,
    default: 0
  },
qualification:{
    type:String,
},
statusRealtion:{
    type:String,
    enum:['unmarried','married']
}
}, { timestamps: true });


module.exports = mongoose.model("user",UserSchema);
