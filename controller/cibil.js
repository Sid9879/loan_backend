const BaseController = require('../core/BaseController');
const Cibil = require('../models/Cibil')
const User = require('../models/User')
const config = require('../config');

const cibilController = new BaseController(Cibil,{
    name:"Cibil",
    access:"customer",
     create: {
    pre: async (data, req, res) => {
      // Ensure user is logged in
      if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
     const existingCibil = await Cibil.findOne({ user: req.user._id });
      if (existingCibil) {
        return res.status(400).json({ 
          message: "Cibil record already exists." 
        });
      }
      data.user = req.user._id;

      return data;
    },
  },

  get:{
     pagination:config.pagination,
        pre: async (filter, req) => {
      if (!req.user || !req.user._id) throw new Error("User not found in request");

      filter.user = req.user._id;

      return filter;
    }
  
   }   
}) 

module.exports = cibilController