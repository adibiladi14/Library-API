const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");

const app = express();
const port = 3000;

app.use(bodyParser.json());

let books = [];
let borrowHistory = [];
let users = [
  { id: 1, name: "User1" },
  { id: 2, name: "User2" },
];
let availableBooks = [
  { id: 101, title: "Book1" },
  { id: 102, title: "Book2" },
];
let unreturnedBooks = [];

// Set zona waktu ke Asia/Jakarta (WIB)
moment.tz.setDefault("Asia/Jakarta");

// Endpoint untuk meminjam buku
app.post("/borrow", (req, res) => {
  const { userId, bookId } = req.body;
  const borrowId = uuidv4(); // Generate UUID untuk id peminjaman
  const borrowedBook = {
    borrowId,
    userId,
    bookId,
    borrowDate: moment().format(),
  }; // Waktu pinjam dengan format WIB
  borrowHistory.push(borrowedBook);
  res.json({
    success: true,
    message: "Book borrowed successfully",
    data: borrowedBook,
  });
});

// Endpoint untuk mengembalikan buku berdasarkan ID peminjaman
app.put("/return/:id", (req, res) => {
  const returnId = req.params.id;
  const returnedBook = borrowHistory.find(
    (borrow) => borrow.borrowId === returnId
  );
  if (returnedBook) {
    returnedBook.returnDate = moment().format(); // Waktu kembali dengan format WIB
    res.json({
      success: true,
      message: "Book returned successfully",
      data: returnedBook,
    });
  } else {
    res
      .status(404)
      .json({ success: false, message: "Book not found in borrow history" });
  }
});

// Endpoint untuk mendapatkan riwayat peminjaman
app.get("/borrow/history", (req, res) => {
  res.json({ success: true, data: borrowHistory });
});

// Endpoint untuk mendapatkan daftar semua anggota perpustakaan
app.get("/users", (req, res) => {
  res.json({ success: true, data: users });
});

// Endpoint untuk mendapatkan daftar buku yang sedang dipinjam
app.get("/borrowed-books", (req, res) => {
  const borrowedBooks = borrowHistory.filter((borrow) => !borrow.returnDate); // Hanya ambil buku yang belum dikembalikan
  res.json({ success: true, data: borrowedBooks });
});

// Endpoint untuk mendapatkan daftar buku yang tersedia untuk dipinjam
app.get("/books/available", (req, res) => {
  const borrowedBookIds = borrowHistory
    .filter((borrow) => !borrow.returnDate)
    .map((borrow) => borrow.bookId); // Filter hanya buku yang belum dikembalikan
  const filteredAvailableBooks = availableBooks.filter(
    (book) => !borrowedBookIds.includes(book.id)
  );
  res.json({ success: true, data: filteredAvailableBooks });
});

// Endpoint untuk mendapatkan daftar buku yang belum dikembalikan
app.get("/books/unreturned", (req, res) => {
  const unreturnedBooks = borrowHistory.filter((borrow) => !borrow.returnDate); // Hanya ambil buku yang belum dikembalikan
  res.json({ success: true, data: unreturnedBooks });
});

// Endpoint untuk mendapatkan daftar buku yang melewati batas waktu pengembalian
app.get("/overdue", (req, res) => {
  const overdueBooks = borrowHistory.filter((book) => {
    return (
      !book.returnDate && moment() > moment(book.borrowDate).add(3, "days")
    ); // Batas waktu pengembalian 3 hari setelah peminjaman
  });
  res.json({ success: true, data: overdueBooks });
});

// Endpoint untuk mendapatkan informasi denda untuk buku berdasarkan ID peminjaman
app.get("/late-fees/:id", (req, res) => {
  const borrowId = req.params.id;
  const overdueBook = borrowHistory.find(
    (book) =>
      book.borrowId === borrowId &&
      !book.returnDate &&
      moment() > moment(book.borrowDate).add(3, "days")
  ); // Batas waktu pengembalian 3 hari setelah peminjaman
  if (overdueBook) {
    const lateFees = calculateLateFees(overdueBook);
    res.json({ success: true, data: { lateFees } });
  } else {
    res
      .status(404)
      .json({ success: false, message: "Book not found in overdue list" });
  }
});

// Endpoint untuk memperbarui masa pinjam buku berdasarkan ID peminjaman
app.put("/borrow/:id/renew", (req, res) => {
  const renewId = req.params.id;
  const renewedBook = borrowHistory.find(
    (borrow) => borrow.borrowId === renewId && !borrow.returnDate
  );
  if (renewedBook) {
    renewedBook.renewalDate = moment().format(); // Waktu perpanjangan dengan format WIB
    res.json({
      success: true,
      message: "Book renewed successfully",
      data: renewedBook,
    });
  } else {
    res.status(404).json({
      success: false,
      message: "Book not found in borrow history or already returned",
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Fungsi untuk menghitung denda
function calculateLateFees(book) {
  const dueDate = moment(book.borrowDate).add(3, "days"); // Batas waktu pengembalian 3 hari setelah peminjaman
  const currentDate = moment();

  if (currentDate > dueDate) {
    const daysLate = currentDate.diff(dueDate, "days");
    const lateFees = daysLate * 100000; // Denda Rp. 100.000 per hari
    return lateFees;
  }

  return 0;
}
