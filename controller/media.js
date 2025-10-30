const express = require('express');
const router = express.Router();
const Image = require('../models/Image');
const ImageWordPressController = require("../core/ImageWordPressController");
const BaseController = require("../core/BaseController");
const config = require('../config');
const auth = require('../controller/auth');

const authenticateToken = auth.authenticateToken;
const authoriseAdmin = auth.authorizeRole(['agent', 'admin']);

const mediaController = new ImageWordPressController(Image, {
    wordpress: config.wordpress,
    quality: { sharpQuality: 80 },
    rootAccessRoles: ["admin"]
});

const publicImageController = new BaseController(Image, {
    access: 'admin',
    get: {
        pagination: config.pagination,
        pre:(filter,req,res)=>{
            if(!(req.user.role == 'admin' || req.user.role == 'editor')) {
                filter.createdBy = req.user._id;
                filter.public = true;
            }
        },
        sort: { createdAt: -1 }
    }
});

const privateImageController = new BaseController(Image, {
    access: 'user',
    accessKey: 'createdBy',
    get: {
        pagination: config.pagination,
        sort: { createdAt: -1 }
    }
});

router.post('/media', authenticateToken ,mediaController.uploadImage);
router.get('/media', authenticateToken, privateImageController.get);
router.get('/media/public',authenticateToken, publicImageController.get);
router.delete('/media/:id', authenticateToken ,mediaController.deleteImage);

router.put('/media/:id', authenticateToken, authoriseAdmin, publicImageController.updateById);



module.exports = router;