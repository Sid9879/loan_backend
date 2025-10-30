const BaseController = require('../core/BaseController');
const User = require('../models/User')
const config = require('../config');
const Loan = require('../models/Loan')
const Credit = require('../models/Credit');
const Insurance = require('../models/Insurance');
const mongoose = require('mongoose')

const basecontroller = new BaseController(User,{
    name:"Agent",
    access:"admin",
  
 
});
basecontroller.getAgents = async (req, res) => {
  try {
    const { name } = req.query;

    let filter = { role: "agent" };
    if (name) {
      filter.name = { $regex: name, $options: "i" }; 
    }

    const agents = await User.find(filter).select("-password -otp");

    if (!agents.length) {
      return res.status(404).json({ message: "No agents available" });
    }

    const totalAgents = agents.length;

    return res.status(200).json({
      message: "Agents fetched successfully",
      totalAgents,
      agents
    });
  } catch (err) {
    console.error("Error fetching agents:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


basecontroller.getLoanStatsApproved = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else if (startDate) {
      dateFilter = { createdAt: { $gte: new Date(startDate) } };
    } else if (endDate) {
      dateFilter = { createdAt: { $lte: new Date(endDate) } };
    }

    const acceptedLoans = await Loan.countDocuments({
      ...dateFilter,
      "status.state": "accepted"
    });

    return res.status(200).json({
      acceptedLoans
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

basecontroller.getTotalLoanStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else if (startDate) {
      dateFilter = { createdAt: { $gte: new Date(startDate) } };
    } else if (endDate) {
      dateFilter = { createdAt: { $lte: new Date(endDate) } };
    }

    if (Object.keys(dateFilter).length > 0) {
      const totalLoansFiltered = await Loan.countDocuments(dateFilter);
      return res.status(200).json({
        totalLoans: totalLoansFiltered
      });
    } else {
      const totalLoansAllTime = await Loan.countDocuments();
      return res.status(200).json({
        totalLoans: totalLoansAllTime
      });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

basecontroller.getLoanPercentage = async (req, res) => {
  try {
    const totalLoans = await Loan.countDocuments();

    const acceptedLoans = await Loan.countDocuments({ "status.state": "accepted" });

    // Calculate accepted percentage
    const acceptedPercentage = totalLoans > 0 
      ? ((acceptedLoans / totalLoans) * 100).toFixed(2) 
      : 0;

    return res.status(200).json({
      totalLoans,
      acceptedLoans,
      acceptedPercentage: Number(acceptedPercentage)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};




const allloancontroller = new BaseController(Loan,{
    name:"Loan",
    access:"admin",
})


basecontroller.getAllLoans = async (req, res) => {
  try {
    const filter = {};

    if (req.query.userId) filter.user = new mongoose.Types.ObjectId(req.query.userId);
    if (req.query.agentId) filter.agent = new mongoose.Types.ObjectId(req.query.agentId);

    if (req.query.status) filter["status.state"] = req.query.status;

    const type = req.query.type; // "credit", "insurance", "loan", or "all"

   const dateFilter = {};
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(req.query.startDate);
      const end = new Date(req.query.endDate);
      const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999); 
      dateFilter.createdAt = { $gte: start, $lte: endOfDay };
    } else if (req.query.startDate) {
      const start = new Date(req.query.startDate);
      dateFilter.createdAt = { $gte: start };
    } else if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
      dateFilter.createdAt = { $lte: endOfDay }; 
    }

    Object.assign(filter, dateFilter); 

    let credits = [], insurances = [], loans = [];

    if (!type || type === "all" || type === "credit") {
      credits = await Credit.find(filter)
        .populate("user", "name mobile")
        .populate("agent", "-password -otp -wallet")
        .lean();
    }

    if (!type || type === "all" || type === "insurance") {
      insurances = await Insurance.find(filter)
        .populate("user", "name mobile")
        .populate("agent", "-password -otp -wallet")
        .lean();
    }

    if (!type || type === "all" || type === "loan") {
      loans = await Loan.find(filter)
        .populate("user", "name mobile")
        .populate("agent", "-password -otp -wallet")
        .lean();
    }

    let allLoans = [
      ...credits.map(c => ({ ...c, type: "credit" })),
      ...insurances.map(i => ({ ...i, type: "insurance" })),
      ...loans.map(l => ({ ...l, type: "loan" }))
    ];

    allLoans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const total = allLoans.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedLoans = allLoans.slice(start, end);

    return res.status(200).json({
      totalLoans: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      loans: paginatedLoans
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};












basecontroller.updateLoanById = async (req, res) => {
  try {
    const { id, type } = req.params; // type = 'credit' | 'insurance' | 'loan'
    const updateData = req.body;

    if (!id || !type) {
      return res.status(400).json({ message: "Please provide id and type" });
    }

    let Model;
    switch (type.toLowerCase()) {
      case 'credit':
        Model = Credit;
        break;
      case 'insurance':
        Model = Insurance;
        break;
      case 'loan':
        Model = Loan;
        break;
      default:
        return res.status(400).json({ message: "Invalid loan type" });
    }

    const updatedDoc = await Model.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
      .populate('user', 'name mobile')
      .populate('agent', 'name email');

    if (!updatedDoc) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.status(200).json({
      message: "Document updated successfully",
      data: updatedDoc
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

basecontroller.deleteLoanById = async (req, res) => {
  try {
    const { id, type } = req.params; // type = 'credit' | 'insurance' | 'loan'

    if (!id || !type) {
      return res.status(400).json({ message: "Please provide id and type" });
    }

    let Model;
    switch (type.toLowerCase()) {
      case 'credit':
        Model = Credit;
        break;
      case 'insurance':
        Model = Insurance;
        break;
      case 'loan':
        Model = Loan;
        break;
      default:
        return res.status(400).json({ message: "Invalid type" });
    }

    const deletedDoc = await Model.findByIdAndDelete(id);

    if (!deletedDoc) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.status(200).json({
      message: `${type} deleted successfully`,
      data: deletedDoc
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

basecontroller.getLoanById = async (req, res) => {
  try {
    const { id, type } = req.params; // type = 'credit' | 'insurance' | 'loan'

    if (!id || !type) {
      return res.status(400).json({ message: "Please provide id and type" });
    }

    let Model;
    switch (type.toLowerCase()) {
      case 'credit':
        Model = Credit;
        break;
      case 'insurance':
        Model = Insurance;
        break;
      case 'loan':
        Model = Loan;
        break;
      default:
        return res.status(400).json({ message: "Invalid type" });
    }

    const doc = await Model.findById(id).populate('user', 'name mobile').populate('agent', 'name email mobile');

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.status(200).json({
      message: `${type} fetched successfully`,
      data: doc
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Toggle block/unblock a user by ID
basecontroller.toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params; // user ID from URL
    if (!id) return res.status(400).json({ message: "User ID is required" });

    // Find user by ID
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Toggle isBlocked status
    user.isBlocked = !user.isBlocked;
    await user.save();

    return res.status(200).json({
      message: `User ${user.name} has been ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        isBlocked: user.isBlocked
      }
    });
  } catch (err) {
    console.error("Error toggling user block status:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


module.exports = {
    basecontroller,
    allloancontroller
};