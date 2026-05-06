const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsRoot = path.join(__dirname, '..', 'public', 'uploads');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (file.fieldname === 'categoryImage') {
      const categoryDir = path.join(uploadsRoot, 'categories');
      ensureDir(categoryDir);
      cb(null, categoryDir);
    } else if (
      file.fieldname === 'productImages' ||
      file.fieldname === 'productMainImage' ||
      file.fieldname === 'productGalleryImages'
    ) {
      const productDir = path.join(uploadsRoot, 'products');
      ensureDir(productDir);
      cb(null, productDir);
    } else {
      ensureDir(uploadsRoot);
      cb(null, uploadsRoot);
    }
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Images Only!');
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
});

module.exports = upload;
