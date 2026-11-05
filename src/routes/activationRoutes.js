const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const activationController = require('../controllers/activationController');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `activation-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.get('/activations', activationController.getActivationListPage);
router.post('/api/activations/upload-excel', upload.single('excelFile'), activationController.uploadExcel);
router.delete('/api/activations/:id', activationController.deleteActivation);
router.post('/api/activations/clear-all', activationController.clearAllActivations);

module.exports = router;
