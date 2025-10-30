const BaseController = require('../core/BaseController');
const InsuranceRenewal = require('../models/InsuranceRenewal');
const config = require('../config');
const User = require('../models/User');

const InsuranceRenewalController = new BaseController(InsuranceRenewal,{
    name:"Insurance Renewal",
    create: {
    pre: async (body, req, res) => {
      try {
        if (!req.user || !req.user._id) {
          throw new Error("User not authenticated.");
        }

        const agents = await User.find({ role: "agent" });
        if (!agents.length) {
          throw new Error("No agents available right now.");
        }

        const randomAgent = agents[Math.floor(Math.random() * agents.length)];

        body.user = req.user._id;
        body.agent = randomAgent._id;
        // body.status = [
        //   {
        //     state: "pending",
        //     remarks: [{ note: "Renewal created" }],
        //   },
        // ];
        return body;
      } catch (error) {
        console.error("Error in pre-create InsuranceRenewal:", error);
        throw error;
      }
    },
  },

  get:{
    pagination:config.pagination,
     populate:[{path:"user",select:"name mobile email"},{path:"agent",select:"name mobile email"}]
  },

  getById:{
    pagination:config.pagination,
    populate:[{path:"user",select:"name mobile email"},{path:"agent",select:"name mobile email"}]
  }

});
module.exports = InsuranceRenewalController