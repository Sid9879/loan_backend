const BaseController = require('../core/BaseController');
const Credit = require('../models/Credit')
const User = require('../models/User')
const config = require('../config');
const Notification = require('../models/Notification')

const creditController = new BaseController(Credit,{
  name:'Credit Card application',
  access:'customer',
  get:{
       pagination:config.pagination,
        populate: [{
              path: 'agent',
              select: 'name mobile'
          },
        ],
        query:["status.state"],
          pre: async (filter, req) => {
        // Ensure logged-in user exists
        if (!req.user || !req.user._id) throw new Error("User not found in request");
  
        // Only fetch loans where the user is the logged-in user
        filter.user = req.user._id;
  
        return filter;
      }
    
     },
     getById: {
      populate:[{
        path:"agent", select:'name mobile'
      }]
     },

updateById: {
  pre: async (filter, updatePayload, req, res) => {
    const doc = await Credit.findOne(filter);
    if (!doc) return res.status(404).json({ message: `Credit not found` });

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

          if (typeof value === "object" && !Array.isArray(value) && value !== null) {
            // Nested object (merge)
            doc.documents[key] = {
              ...doc.documents[key],
              ...value
            };
          } else {
            // Primitive/string (assign directly)
            doc.documents[key] = value;
          }
        }
      }
      delete updatePayload.documents;
    }

    // Merge remaining top-level fields
    Object.assign(doc, updatePayload);

    // Save the document
    await doc.save();
  }
}




});
creditController.createCredit = async (req, res) => {
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
    remarks: [{ note: "Credit-card application created" }]
  }
]
    };

    const newCredit = await Credit.create(loanData);
    const savedcreate = await Credit.findById(newCredit._id)
      .populate("agent", "name email mobile")
      .populate("user", "name email mobile")
      .lean(); 

    
    return res.status(201).json({
      message: "Credit application submitted successfully",
      Credit: savedcreate,
    });

  } catch (error) {
    console.error(error);
    return res.status(400).json({
      message: "Error submitting Credit application",
      error: error.message,
    });
  }
};


const agentbaseControllercredit = new BaseController(Credit,{
  name:"Credit Application",
  access:"agent",

  get:{
     pagination:config.pagination,
      populate: [{
            path: 'user', select:"-password -otp"
        },
      ],
      query:['status.state' ,'name'],
      pre: async (filter, req) => {
    if (!req.user || !req.user._id) throw new Error("User not found in request");

    filter.agent = req.user._id;
    return filter;
}
  },

  getById:{
    populate:[{path:"user",select:"-password -otp"}]
  },
 
})




agentbaseControllercredit.updateCreditById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Credit ID is required" });

    const { state, remark, missingDocuments, documents: newDocuments, ...otherFields } = req.body;

    // 🔍 Fetch existing credit
    const credit = await Credit.findById(id);
    if (!credit) return res.status(404).json({ message: "Credit not found" });

    // 🧩 Update other fields directly
    Object.assign(credit, otherFields);

    // 🗂 Merge nested documents
    if (newDocuments) {
      for (const key in newDocuments) {
        if (newDocuments.hasOwnProperty(key)) {
          credit.documents[key] = {
            ...credit.documents[key],
            ...newDocuments[key],
          };
        }
      }
    }

    // 💬 Handle status & remarks
    const newRemark = remark ? { note: remark, createdAt: new Date() } : null;
    const lastStatus = credit.status?.[credit.status.length - 1];
    const oldState = lastStatus?.state || "pending";

    if (lastStatus) {
      if (newRemark) lastStatus.remarks.push(newRemark);

      if (state) lastStatus.state = state;

      if (missingDocuments && Array.isArray(missingDocuments)) {
        lastStatus.missingDocuments = missingDocuments; // Update inside status
      }

      lastStatus.updatedAt = new Date();
    } else {
      credit.status.push({
        state: state || "pending",
        remarks: newRemark ? [newRemark] : [],
        missingDocuments: missingDocuments || [],
        updatedAt: new Date(),
      });
    }

    // Assign agent
    if (req.user && req.user._id) credit.agent = req.user._id;

    // Save credit
    credit.updatedAt = new Date();
    await credit.save();

    // 🔔 Notification for status change
    if (state && oldState !== state) {
      await Notification.create({
        agentName: req.user?._id || null,
        user: credit.user,
        message: `Credit status changed from ${oldState} → ${state}`,
        status: state,
        remark: remark || "",
      });
    }

    // 🔔 Notification for missing documents
    if (missingDocuments && missingDocuments.length > 0) {
      const missingList = missingDocuments.map(d => d.name).join(", ");
      await Notification.create({
        agentName: req.user?._id || null,
        user: credit.user,
        message: `Missing documents requested: ${missingList}`,
        status: "missingDocuments",
        remark: remark || "",
      });
    }

    res.status(200).json({
      message: "Credit updated successfully",
      data: credit,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error in server",
      error: err.message,
    });
  }
};




module.exports = {
  creditController,
  agentbaseControllercredit
};