const BaseController = require('../core/BaseController');
const Insurance = require('../models/Insurance')
const User = require('../models/User')
const config = require('../config');
const Notification = require('../models/Notification')

const insuranceController = new BaseController(Insurance,{
    name:"Insurance",
    access:"customer",
     get:{
         pagination:config.pagination,
          populate: [{
                path: 'agent',
                select: 'name mobile'
            },
          ],
            pre: async (filter, req) => {
          if (!req.user || !req.user._id) throw new Error("User not found in request");
    
          filter.user = req.user._id;
    
          return filter;
        }
      
       },
       getById:{
        populate:[{
          path:'agent', select:'name mobile'
        }]
       } 
});

insuranceController.createLoan = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated." });
    }

    const agents = await User.find({ role: "agent" });
    if (!agents.length) {
      return res.status(503).json({ message: "No agents available right now." });
    }

    const randomAgent = agents[Math.floor(Math.random() * agents.length)];

    const InsuranceData = {
      ...req.body,
      user: req.user._id,
      agent: randomAgent._id,
      status: [
  {
    state: "pending",
    remarks: [{ note: "Insurance created" }]
  }
]
    };

    const newLoan = await Insurance.create(InsuranceData);
    const SavedInsurance = await Insurance.findById(newLoan._id)
      .populate("agent", "name  mobile")
      .populate("user", "name  mobile")
      .lean(); 

    
    return res.status(201).json({
      message: "Insurance application submitted successfully",
      Insurance: SavedInsurance,
    });

  } catch (error) {
    console.error(error);
    return res.status(400).json({
      message: "Error submitting loan application",
      error: error.message,
    });
  }
};

const agentInsuranceController = new BaseController(Insurance,{
  name:"Insurance Application",
  access:"agent",

  get:{
     pagination:config.pagination,
      populate: [{
            path: 'user', select:'-password -otp'
        },
      ],
      query:['name','status.state'],
      pre: async (filter, req) => {
    if (!req.user || !req.user._id) throw new Error("User not found in request");

    filter.agent = req.user._id;
    return filter;
}
  },

  getById:{
        populate:[{
          path:'agent', select:'name mobile'
        },{path:"user",select:'-password -otp'}]
   }  
})

agentInsuranceController.updateInsuranceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Insurance ID is required" });

    const updateData = { ...req.body };
    const { state, remark, ...otherFields } = updateData;

    const loan = await Insurance.findById(id);
    if (!loan) return res.status(404).json({ message: "Insurance not found" });

    Object.assign(loan, otherFields);

    const newRemark = remark ? { note: remark, createdAt: new Date() } : null;

    const lastStatus = loan.status[loan.status.length - 1];
    const oldState = lastStatus?.state; 

    if (lastStatus) {
      if (newRemark) lastStatus.remarks.push(newRemark);

      if (state) lastStatus.state = state;

      lastStatus.updatedAt = new Date();
    } else {
      loan.status.push({
        state: state || "pending",
        remarks: newRemark ? [newRemark] : [],
        updatedAt: new Date()
      });
    }

    if (req.user && req.user._id) loan.agent = req.user._id;

    await loan.save();

    if (state && oldState !== state) {
      await Notification.create({
        agentName: req.user._id,
        user: loan.user,
        message: `Insurance status changed from ${oldState || "pending"} → ${state}`,
        status: state,
        remark: newRemark?.note || ""
      });
    }

    res.status(200).json({ message: "Insurance updated successfully", data: loan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error in server", error: err.message });
  }
};

module.exports ={ 
  insuranceController,
  agentInsuranceController
}