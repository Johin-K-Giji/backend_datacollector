const express = require("express");
const multer = require("multer");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");

const prisma = new PrismaClient();
const router = express.Router();

// Multer Setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Store uploaded images in 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
  },
});

const upload = multer({ storage });

// Create Folder Route (Root or Subfolder)
router.post("/folders", async (req, res) => {
  const { name, parentId } = req.body;
  const userId = req.user.id;

  try {
    const folder = await prisma.folder.create({
      data: {
        name,
        userId,
        parentId: parentId || null, 
      }});

    res.status(201).json(folder);
  } catch (error) {
    res.status(500).json({ message: "Error creating folder", error: error.message });
  }
});

// Fetch Folders (including Subfolders)
router.get("/folders", async (req, res) => {
  const userId = req.user.id;

  try {
    const folders = await prisma.folder.findMany({
      where: { userId, parentId: null }, // Fetch root folders
      include: {
        subfolders: true, // Include subfolders
      },
    });

    res.status(200).json(folders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching folders", error: error.message });
  }
});

// Upload Document and Convert to PDF
router.post("/documents", upload.single("file"), async (req, res) => {
  const { folderId } = req.body;
  const userId = req.user.id;
  const file = req.file;

  try {
    // Check if folder belongs to the user
    const folder = await prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!folder) return res.status(404).json({ message: "Folder not found" });

    // Convert image to PDF
    const doc = await PDFDocument.create();
    const imageBytes = fs.readFileSync(file.path);
    const image = await doc.embedJpg(imageBytes);
    const page = doc.addPage();
    const { width, height } = page.getSize();
    page.drawImage(image, { x: 0, y: height - image.height, width: image.width, height: image.height });

    // Save PDF to file system
    const pdfBytes = await doc.save();
    const pdfPath = `uploads/pdf-${Date.now()}.pdf`;
    fs.writeFileSync(pdfPath, pdfBytes);

    // Create Document record in database
    const document = await prisma.document.create({
      data: {
        name: file.originalname,
        folderId,
        path: pdfPath,
      },
    });

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: "Error uploading document", error: error.message });
  }
});

module.exports = router;
