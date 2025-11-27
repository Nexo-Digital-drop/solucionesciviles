const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 4000;

const DATA_FILE = path.join(__dirname, 'products.json');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// === CARPETA PARA FOTOS ===
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// === CONFIG MULTER (hasta 5 fotos) ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage }).array('images', 5);

// === HELPERS JSON ===
function loadProducts() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];

    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    if (!raw.trim()) return [];

    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;

    return [];
  } catch (err) {
    console.error('Error leyendo products.json:', err);
    return [];
  }
}

function saveProducts(products) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando products.json:', err);
  }
}

// === API: OBTENER PRODUCTOS ===
app.get('/api/products', (req, res) => {
  const rawProducts = loadProducts();

  const products = rawProducts.map(p => {
    let imageUrl = p.imageUrl || '';

    if (!imageUrl && Array.isArray(p.images) && p.images.length > 0) {
      imageUrl = p.images[0]; // primera foto como principal
    }

    return {
      ...p,
      imageUrl
    };
  });

  res.json(products);
});

// === API: CREAR PRODUCTO (con hasta 5 fotos) ===
app.post('/api/products', (req, res) => {
  upload(req, res, err => {
    if (err) {
      console.error('Error subiendo imágenes:', err);
      return res.status(500).json({ ok: false, error: 'Error subiendo imágenes' });
    }

    const { title, category, description, power, price } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ ok: false, error: 'Título y descripción son obligatorios' });
    }

    const images = (req.files || []).map(file => '/uploads/' + file.filename);
    const imageUrl = images[0] || '';

    const products = loadProducts();

    const newProduct = {
      id: Date.now(),
      title,
      category: category || '',
      description: description || '',
      power: power || '',
      price: price || '',
      images,
      imageUrl
    };

    products.push(newProduct);
    saveProducts(products);

    res.json({ ok: true, product: newProduct });
  });
});

// Servir carpeta de uploads (por si acaso)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// === SERVIDOR ===
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
