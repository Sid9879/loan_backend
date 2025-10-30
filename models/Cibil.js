const mongoose = require('mongoose');

const cibil = new mongoose.Schema({
    user:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"user",
            required:[true,"user id is required"]
        },
    name:{
        type:String,
        required:[true,'name  required']
    },
    relationOccupation:{
        type:String,
        required:[true,'occupation required']
    },
    email:{
        type:String,
        required:[true,'email required']

    },
    mobile:{
        type:String,
        required:[true,'mobile required']
    },
    gender:{
        type:String,
        enum:['male',"female","other"],
        required: true,
    },
    dob:{
        type:Date,
        required:[true,'mobile required']
        
    },
    alternateNo:{
        type:Number
    },
    relation:{
        type:String,
        required:[true,'relation with required']

    },
    occupation:{
        type:String,
        required:[true,"occupation is required "]
    },
    monthlyIncome:{
        type:Number
    },
   members:{
    type:Number,
    required:[true,"members is required "]
   },
   family:{
    type:String,
    required:[true,"family is required "]
   },
   witnessName:{
    type:String
   },
   WitnessMobileNo:{
    type:Number
   },
   witnessRelation:{
    type:String
   },
},{timestamps:true})

module.exports = mongoose.model('cibil',cibil)