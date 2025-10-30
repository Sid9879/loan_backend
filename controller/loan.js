const BaseController = require('../core/BaseController');
const Loan = require('../models/Loan')
const User = require('../models/User')
const config = require('../config');
const Notification = require('../models/Notification');


const baseController = new BaseController(Loan,{
   name:"Loan Application",
   access:"customer",
   get:{
     pagination:config.pagination,
      populate: [{
            path: 'agent',
            select: 'name mobile'
        },{path:"loanType",select:"name"}
      ],
      query:["loanType"],
        pre: async (filter, req) => {
      // Ensure logged-in user exists
      if (!req.user || !req.user._id) throw new Error("User not found in request");

      filter.user = req.user._id;

      return filter;
    }
  
   },

   getById:{
        populate:[{
          path:'agent', select:'name mobile'
        },{path:"loanType",select:"name"}]
   },

updateById: {
  pre: async (filter, updatePayload, req, res) => {
    // Use the model directly
    const doc = await Loan.findOne(filter); // or Credit.findOne(filter)
    if (!doc) return res.status(404).json({ message: `Loan not found` });

    const lastStatus = doc.status[doc.status.length - 1];

    // Allow customer update only if last status is missingDocuments
    if (req.user.role === 'customer') {
      if (!lastStatus || lastStatus.state !== 'missingDocuments') {
        return res.status(403).json({
          message: `Cannot update. Status must be 'missingDocuments'.`
        });
      }
    }

    // Handle missingDocuments
    if (updatePayload.missingDocuments && Array.isArray(updatePayload.missingDocuments)) {
      lastStatus.missingDocuments = updatePayload.missingDocuments;
      delete updatePayload.missingDocuments;
    }

    // Handle remarks
    if (updatePayload.remark) {
      lastStatus.remarks.push({ note: updatePayload.remark, createdAt: new Date() });
      delete updatePayload.remark;
    }

    // Customers cannot change state
    if (updatePayload.state) delete updatePayload.state;

    // Merge documents safely
    if (updatePayload.documents) {
      for (const key in updatePayload.documents) {
        if (updatePayload.documents.hasOwnProperty(key)) {
          const value = updatePayload.documents[key];

          if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Nested object: merge
            doc.documents[key] = {
              ...doc.documents[key],
              ...value
            };
          } else {
            // Primitive/string: assign directly
            doc.documents[key] = value;
          }
        }
      }
      delete updatePayload.documents;
    }

    // Merge remaining top-level fields (like name)
    Object.assign(doc, updatePayload);

    // Save after nested updates
    await doc.save();
  }
}


})

baseController.createLoan = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated." });
    }

    const agents = await User.find({ role: "agent" });
    if (!agents.length) {
      return res.status(503).json({ message: "No agents available right now." });
    }
    

    const randomAgent = agents[Math.floor(Math.random() * agents.length)];

    const loanData = {
      ...req.body,
      user: req.user._id,
      agent: randomAgent._id,
      status: [
  {
    state: "pending",
    remarks: [{ note: "Loan created" }]
  }
]
    };

    const newLoan = await Loan.create(loanData);
    const savedLoan = await Loan.findById(newLoan._id)
      .populate("agent", "name email mobile")
      .populate("user", "name email mobile")
      .lean(); 

    
    return res.status(201).json({
      message: "Loan application submitted successfully",
      loan: savedLoan,
    });

  } catch (error) {
    console.error(error);
    return res.status(400).json({
      message: "Error submitting loan application",
      error: error.message,
    });
  }
};

const agentbaseController = new BaseController(Loan,{
  name:"Loan Application",
  access:"agent",

  get:{
     pagination:config.pagination,
      populate: [{
            path: 'user',select:'-password -otp'
        },
        {path:"loanType",select:"name"}
      ],
      query:["status.state",'loanType'],
      pre: async (filter, req) => {
    if (!req.user || !req.user._id) throw new Error("User not found in request");

    filter.agent = req.user._id;
    return filter;
}
  },
  getById:{
    populate:[{path:"user",select:"-password -otp"},{path:"loanType",select:"name"}]
  }
})



//isko hrr jagah likhna hai...

agentbaseController.updateLoanById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Loan ID is required" });

    const { state, remark, missingDocuments, documents: newDocuments, ...otherFields } = req.body;

   
    const loan = await Loan.findById(id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    // Update other fields
    Object.assign(loan, otherFields);

    // Merge new documents
    if (newDocuments) {
      for (const key in newDocuments) {
        if (newDocuments.hasOwnProperty(key)) {
          loan.documents[key] = {
            ...loan.documents[key],
            ...newDocuments[key],
          };
        }
      }
    }

    // Manage status and remarks
    const newRemark = remark ? { note: remark, createdAt: new Date() } : null;
    const lastStatus = loan.status?.[loan.status.length - 1];
    const oldState = lastStatus?.state || "pending";

    if (lastStatus) {
      // Append new remark
      if (newRemark) lastStatus.remarks.push(newRemark);

      // Update state if provided
      if (state) lastStatus.state = state;

      // ✅ Update missing documents correctly (INSIDE status)
      if (missingDocuments && Array.isArray(missingDocuments)) {
        lastStatus.missingDocuments = missingDocuments;
      }

      lastStatus.updatedAt = new Date();
    } else {
      // If no status exists, create one
      loan.status.push({
        state: state || "pending",
        remarks: newRemark ? [newRemark] : [],
        missingDocuments: missingDocuments || [],
        updatedAt: new Date(),
      });
    }

   
    if (req.user && req.user._id) loan.agent = req.user._id;


    loan.updatedAt = new Date();
    await loan.save();

    // 🔔 Create notification when state changes
    if (state && oldState !== state) {
      await Notification.create({
        agentName: req.user?._id || null,
        user: loan.user,
        message: `Loan status changed from ${oldState} → ${state}`,
        status: state,
        remark: remark || "",
      });
    }

   //Missing documents k liye notification
    if (missingDocuments && missingDocuments.length > 0) {
      const missingList = missingDocuments.map(d => d.name).join(", ");
      await Notification.create({
        agentName: req.user?._id || null,
        user: loan.user,
        message: `Missing documents requested: ${missingList}`,
        status: "missingDocuments",
        remark: remark || "",
      });
    }

    res.status(200).json({
      message: "Loan updated successfully",
      data: loan,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error in server",
      error: err.message,
    });
  }
};





agentbaseController.getPendingLoansForAgent = async (req, res) => {
  try {
    let agentId;

    if (req.params.agentId) {
      agentId = req.params.agentId;
    } else if (req.query.agentId) {
      agentId = req.query.agentId;
    } else if (req.user && req.user._id) {
      agentId = req.user._id;
    } else {
      return res.status(401).json({ message: "Agent ID not provided or user not authenticated" });
    }

    const { startDate, endDate } = req.query;

    let filter = { agent: agentId, "status.state": "pending" };

    if (startDate || endDate) {
      filter["status.updatedAt"] = {};
      if (startDate) filter["status.updatedAt"].$gte = new Date(startDate);
      if (endDate) filter["status.updatedAt"].$lte = new Date(endDate);
    }

    const pendingCount = await Loan.countDocuments(filter);

    return res.status(200).json({
      agentId,
      pendingCount
    });
  } catch (err) {
    console.error("Error fetching pending loan count:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};




agentbaseController.getMissingDocumentCount = async (req, res) => {
  try {
    let agentId;

    if (req.params.agentId) {
      agentId = req.params.agentId;
    } else if (req.user && req.user._id) {
      agentId = req.user._id;
    } else {
      return res.status(401).json({ message: "Agent ID not provided or user not authenticated" });
    }

    const { startDate, endDate } = req.query;

    let filter = { agent: agentId, "status.state": "Missing Document" };

    if (startDate || endDate) {
      filter["status.updatedAt"] = {};
      if (startDate) filter["status.updatedAt"].$gte = new Date(startDate);
      if (endDate) filter["status.updatedAt"].$lte = new Date(endDate);
    }

    const missingDocumentLoans = await Loan.countDocuments(filter);

    return res.status(200).json({
      agentId,
      missingDocumentLoans
    });
  } catch (err) {
    console.error("Error fetching missing document count:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


agentbaseController.getAcceptedLoansForAgent = async (req, res) => {
  try {
    let agentId;

    if (req.params.agentId) {
      agentId = req.params.agentId;
    } else if (req.user && req.user._id) {
      agentId = req.user._id;
    } else {
      return res.status(401).json({ message: "Agent ID not provided or user not authenticated" });
    }

    const { startDate, endDate } = req.query;

    let filter = { agent: agentId, "status.state": "accepted" };

    if (startDate || endDate) {
      filter["status.updatedAt"] = {};
      if (startDate) filter["status.updatedAt"].$gte = new Date(startDate);
      if (endDate) filter["status.updatedAt"].$lte = new Date(endDate);
    }

    const acceptedLoans = await Loan.countDocuments(filter);

    return res.status(200).json({
      agentId,
      acceptedLoans
    });
  } catch (err) {
    console.error("Error fetching accepted loans:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


agentbaseController.getAcceptedLoanPercentageForAgent = async (req, res) => {
  try {
    let agentId;

    if (req.params.agentId) {
      agentId = req.params.agentId;
    } else if (req.user && req.user._id) {
      agentId = req.user._id;
    } else {
      return res.status(401).json({ message: "Agent ID not provided or user not authenticated" });
    }

    const totalLoans = await Loan.countDocuments({ agent: agentId });

    const acceptedLoans = await Loan.countDocuments({
      agent: agentId,
      "status.state": "accepted"
    });

    const acceptedPercentage =
      totalLoans > 0 ? ((acceptedLoans / totalLoans) * 100).toFixed(2) : 0;

    return res.status(200).json({
      agentId,
      totalLoans,
      acceptedLoans,
      acceptedPercentage: `${acceptedPercentage}%`
    });
  } catch (err) {
    console.error("Error fetching accepted loan stats:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};





module.exports ={ 
  baseController,
  agentbaseController
}