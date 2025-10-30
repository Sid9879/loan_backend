const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
   agentName:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user',
   },
   user:{
      type:mongoose.Schema.Types.ObjectId,
      ref:'user',
   },
   attachement:{
    type:String,
   },
   message:{
    type:String,
   },
   status:{
      type:String,
   },
   remark:{
      type:String,
   }
},{timestamps:true});
module.exports = mongoose.model('notification',notificationSchema)