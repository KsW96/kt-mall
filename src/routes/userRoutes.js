const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userController = require('../controllers/userController');

// 업로드 임시 디렉토리
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `excel-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 최대 50MB 엑셀 허용
});

router.get('/users', userController.getUserListPage);
router.post('/api/users/upload-excel', upload.single('excelFile'), userController.uploadExcel);
router.delete('/api/users/:un', userController.deleteUser);
router.post('/api/users/clear-all', userController.clearAllUsers);

module.exports = router;

