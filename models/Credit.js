const mongoose = require('mongoose');

const credit = new mongoose.Schema({
    user:{
             type: mongoose.Schema.Types.ObjectId,
                    ref:"user",
                    required:[true,"user id is required"]
        },
 name:{
  type:String,
  required:[true,'name is required']
 },
          documents: {
  
    aadhar: {
      aadharNo: {
        type: Number,
        
        maxlength: 12,
        required: [true, "Aadhar no. is required"],
      },
      aadharImg: [
        {
          aadharFront: {
            type: String,
            required: [true, "Front image required"],
          },
          aadharBack: {
            type: String,
            required: [true, "Back image required"],
          },
        },
      ],
    },

    pan: {
      panNo: {
        type: String,
       
        required: [true, "PAN no. is required"],
      },
      panImg: {
        type: String,
        required: [true, "PAN image is required"],
      },
    },

   
    electricity: {
      electricityBillNo: {
        type: String,
        required: [true, "Bill no. is required"],
      },
      img: {
        type: String,
        required: [true, "Image required"],
      },
    },

    // General image
    img: {
      type: String,
      required: [true, "Image required"],
    },

    // Bank Details
    bank: {
      AcNo: {
        type: String,
        required: [true, "Account no. is required"],
      },
      ifsc: {
        type: String,
        required: [true, "IFSC code is required"],
      },
      name: {
        type: String,
        required: [true, "Bank name is required"],
      },
      statement: {
        type: String, // can be a URL or file path
      },
    },

    // Salaried Person Details
    salariedPerson: {
      slip: { type: String },
      idCardNo: { type: String },
      idImg: { type: String },
      formNo16: { type: String },
      formImg: { type: String },
    },

    // Business Person Details
    businessman: {
      gstNo: { type: String,  },
      gstImg: { type: String },
      itrNo: { type: String, },
      itrImg: { type: String },
      form16: { type: String },
    },
  },
 status: [
  {
    state: {
      type: String,
      enum: ['pending',"underReview", 'accepted', 'rejected',"missingDocuments","awaitingSignature",'awaitingDisbursement',"disbursed","closed"],
      default:'pending',
      required: true
    },
    remarks: [
      {
        note: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    missingDocuments:[
      {
        name:{type:String},
        url:{type:String}
      }
    ]
  }
], 
agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user" 
  }
},{timestamps:true})
credit.index({name:"text"})

module.exports = mongoose.model('credit',credit)