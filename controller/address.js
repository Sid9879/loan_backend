const Address = require('../models/Address');

exports.getAddressByPin = async (req, res) => {
  const { pinCode } = req.params;
  try {
    const address = await Address.findOne({ pincode:parseInt(pinCode) }).lean();
    if (!address) {
      return res.status(404).json({ error: "Address not found" });
    }
    res.json({
      message:" Address fetched successfully",
      data: address
    });
  } catch (err) {
    console.error("❌ Error fetching address:", err);
    res.status(500).json({ error: "Failed to fetch address" });
  }
};