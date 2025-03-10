// converter.js
const sqlite3 = require('sqlite3').verbose()
const mysql = require('mysql2/promise')

const sqliteDbPath = './database.sqlite' // Path ke database SQLite
const mysqlConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pacar_ai',
}

// Struktur tabel untuk MySQL
const tableDefinitions = {
    messages: `
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            historyId INT,
            userId VARCHAR(255),
            role VARCHAR(255),
            \`character\` VARCHAR(255),
            message TEXT,
            isExpired BOOLEAN DEFAULT FALSE,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
    messages_whatsapp2: `
        CREATE TABLE IF NOT EXISTS messages_whatsapp2 (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fromNo VARCHAR(255),
            fromMe BOOLEAN DEFAULT FALSE,
            role VARCHAR(255) DEFAULT 'user',
            message TEXT,
            isExpired BOOLEAN DEFAULT FALSE,
            isCharacter BOOLEAN DEFAULT FALSE,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
    system_messages: `
        CREATE TABLE IF NOT EXISTS system_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            historyId INT,
            userId VARCHAR(255),
            role VARCHAR(255),
            \`character\` VARCHAR(255),
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
    users: `
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL
        )
    `,
    character_select: `
        CREATE TABLE IF NOT EXISTS character_select (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId VARCHAR(255),
            name VARCHAR(255),
            \`character\` VARCHAR(255),
            interests TEXT,
            hobbies TEXT,
            status VARCHAR(255),
            gender VARCHAR(255),
            avatar VARCHAR(255),
            description TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
}

// Fungsi untuk membuat tabel jika belum ada
const createTables = async (mysqlConnection) => {
    for (const tableName in tableDefinitions) {
        await mysqlConnection.query(tableDefinitions[tableName])
    }
}

const convertSQLiteToMySQL = async () => {
    // Koneksi ke SQLite
    const sqliteDb = new sqlite3.Database(sqliteDbPath)

    // Koneksi ke MySQL
    const mysqlConnection = await mysql.createConnection(mysqlConfig)

    // Membuat tabel jika belum ada
    await createTables(mysqlConnection)

    // Fungsi untuk menyalin data dari SQLite ke MySQL
    const transferData = async (tableName) => {
        return new Promise((resolve, reject) => {
            const selectQuery = `SELECT * FROM ${tableName}`
            sqliteDb.all(selectQuery, [], async (err, rows) => {
                if (err) {
                    reject(err)
                    return
                }

                // Menyiapkan data untuk disisipkan ke MySQL
                const columnNames = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ') // Mengelilingi nama kolom dengan backticks
                const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES ?`
                const values = rows.map(row => Object.values(row).map(value => value ? value.toString().replace(/'/g, "''") : null)) // Escape single quotes

                // Menyisipkan data ke MySQL
                try {
                    await mysqlConnection.query(insertQuery, [values])
                    resolve()
                } catch (insertError) {
                    console.error(`Error inserting data into ${tableName}:`, insertError)
                    reject(insertError)
                }
            })
        })
    }

    // Daftar tabel yang ingin dipindahkan
    const tables = Object.keys(tableDefinitions) // Mengambil nama tabel dari definisi

    // Transfer data untuk setiap tabel
    for (const table of tables) {
        console.log(`Transferring data from ${table}...`)
        await transferData(table)
        console.log(`Data transferred for ${table}`)
    }

    // Menutup koneksi
    sqliteDb.close()
    await mysqlConnection.end()
    console.log('Transfer complete.')
}

// Menjalankan konversi
convertSQLiteToMySQL().catch(err => console.error(err))