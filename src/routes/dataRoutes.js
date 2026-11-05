const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dataController = require('../controllers/dataController');

// 업로드 디렉토리 확인 및 생성
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

router.get('/data', dataController.getDataList);
router.get('/data/download', dataController.downloadCsv);
router.get('/data/:id', dataController.getDataDetail);
router.post('/data', dataController.createData);
router.post('/data/upload', upload.single('dataFile'), dataController.uploadData);

module.exports = router;

