const Notification = require('../models/Notification')


// Create a new notification
const createNotification = async (req, res) => {
  try {
    const { agentName, attachement, message } = req.body;

    if (!agentName || !attachement || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newNotification = await Notification.create({
      agentName,
      attachement,
      message,
      user: req.user._id,
    });

    return res.status(201).json({
      message: 'Notification created successfully',
      notification: newNotification
    });
  } catch (err) {
    console.error('Error creating notification:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
//Admin side...
const getAllNotificationsWithAgent = async (req, res) => {
  try {
    const search = req.query.search; 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit; 
    
    const pipeline = [];

    pipeline.push({
      $lookup: {
        from: 'users', 
        localField: 'agentName',
        foreignField: '_id',
        as: 'agentName'
      }
    });
    pipeline.push({ $unwind: { path: '$agentName', preserveNullAndEmptyArrays: true } });
    
    pipeline.push({
      $lookup: {
        from: 'users', 
        localField: 'user',
        foreignField: '_id',
        as: 'user'
      }
    });
    pipeline.push({ $unwind: { path: '$user', preserveNullAndEmptyArrays: true } });

    if (search) {
      const regex = new RegExp(search, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'agentName.name': { $regex: regex } },
            { 'user.name': { $regex: regex } },
          ],
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });
    
    pipeline.push({
      $project: {
        _id: 1,
        message: 1,
        status: 1,
        remark: 1,
        createdAt: 1,
        agentName: { _id: '$agentName._id', name: '$agentName.name', mobile: '$agentName.mobile', avatar: '$agentName.avatar' },
        user: { _id: '$user._id', name: '$user.name', mobile: '$user.mobile', avatar: '$user.avatar' },
      }
    });
    
    pipeline.push({
        $facet: {
            metadata: [{ $count: "totalCount" }],
            data: [{ $skip: skip }, { $limit: limit }],
        },
    });

    const result = await Notification.aggregate(pipeline);

    const [notificationsData] = result;
    const paginatedNotifications = notificationsData.data;
    const totalCount = notificationsData.metadata.length > 0 ? notificationsData.metadata[0].totalCount : 0;
    const totalPages = Math.ceil(totalCount / limit);

    if (totalCount === 0) {
      return res.status(200).json({ 
        totalCount: 0, 
        page: page,
        limit: limit,
        totalPages: 0,
        notifications: [] 
      });
    }

    return res.status(200).json({
      totalCount: totalCount,
      page: page,
      limit: limit,
      totalPages: totalPages,
      notifications: paginatedNotifications
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//Customer...

const getCustomerNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    const search = req.query.search; 

    const pipeline = [];

    if (role === "agent") {
      pipeline.push({ $match: { agentName: userId } });
    } else {
      pipeline.push({ $match: { user: userId } });
    }

    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'agentName',
        foreignField: '_id',
        as: 'agentName'
      }
    });
    pipeline.push({ $unwind: { path: '$agentName', preserveNullAndEmptyArrays: true } });
    
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user'
      }
    });
    pipeline.push({ $unwind: { path: '$user', preserveNullAndEmptyArrays: true } });

    if (search) {
      const regex = new RegExp(search, 'i');
      pipeline.push({
        $match: {

          'user.name': { $regex: regex }, 
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });
    
    pipeline.push({
      $project: {
        _id: 1,
        agentName: { _id: '$agentName._id', name: '$agentName.name', mobile: '$agentName.mobile', avatar: '$agentName.avatar', email: '$agentName.email' },
        user: { _id: '$user._id', name: '$user.name', mobile: '$user.mobile', avatar: '$user.avatar', email: '$user.email', role: '$user.role' },
        attachement: 1,
        message: 1,
        status: 1,
        remark: 1,
        createdAt: 1,
        updatedAt: 1,
        __v: 1,
      }
    });

    const notifications = await Notification.aggregate(pipeline);

    if (!notifications || notifications.length === 0) {
      return res.status(200).json({ 
        success: true,
        count: 0,
        data: [] 
      });
    }

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};




module.exports = {
  createNotification,
  getAllNotificationsWithAgent,
  getCustomerNotification
};
